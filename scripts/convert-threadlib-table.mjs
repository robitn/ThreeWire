import { readFile, writeFile } from 'node:fs/promises'

const [sourcePath, outputPath] = process.argv.slice(2)

if (!sourcePath || !outputPath) {
    throw new Error('Usage: node scripts/convert-threadlib-table.mjs <source> <output>')
}

const source = await readFile(sourcePath, 'utf8')
const tableStart = source.indexOf('[')
const tableEnd = source.lastIndexOf(']')
const tableJson = source.slice(tableStart, tableEnd + 1).replace(/,\s*]/g, ']')
const entries = JSON.parse(tableJson)

const standardDefinitions = {
    metric: { id: 'metric', label: 'Metric ISO', system: 'metric', angle: 60 },
    unc: { id: 'unc', label: 'UNC', system: 'imperial', angle: 60 },
    unf: { id: 'unf', label: 'UNF', system: 'imperial', angle: 60 },
    unef: { id: 'unef', label: 'UNEF', system: 'imperial', angle: 60 },
    '4-un': { id: '4-un', label: '4-UN', system: 'imperial', angle: 60 },
    '6-un': { id: '6-un', label: '6-UN', system: 'imperial', angle: 60 },
    '8-un': { id: '8-un', label: '8-UN', system: 'imperial', angle: 60 },
    '12-un': { id: '12-un', label: '12-UN', system: 'imperial', angle: 60 },
    '16-un': { id: '16-un', label: '16-UN', system: 'imperial', angle: 60 },
    '20-un': { id: '20-un', label: '20-UN', system: 'imperial', angle: 60 },
    '28-un': { id: '28-un', label: '28-UN', system: 'imperial', angle: 60 },
    '32-un': { id: '32-un', label: '32-UN', system: 'imperial', angle: 60 },
    bsp: { id: 'bsp', label: 'BSP parallel (G)', system: 'imperial', angle: 55 },
    pco: { id: 'pco', label: 'Packaging thread', system: 'metric', angle: null },
    rms: { id: 'rms', label: 'RMS', system: 'imperial', angle: null },
}

function getStandard(designator) {
    if (designator.startsWith('G')) return standardDefinitions.bsp
    if (designator.startsWith('M')) return standardDefinitions.metric
    if (designator.startsWith('PCO-')) return standardDefinitions.pco
    if (designator.startsWith('RMS-')) return standardDefinitions.rms

    const prefix = designator.match(/^(UNC|UNF|UNEF|[468]|12|16|20|28|32)-/)?.[1]?.toLowerCase()
    if (!prefix) return null
    return standardDefinitions[prefix === '4' || prefix === '6' || prefix === '8' ? `${prefix}-un` : prefix]
}

function parseNominalDiameterMm(designator, standard) {
    if (standard.id === 'metric') {
        return Number(designator.match(/^M([\d.]+)/)?.[1])
    }

    if (standard.id === 'bsp') {
        return null
    }

    const size = designator.match(/(?:-|^)(#?\d+(?:[ /]\d+)?(?:\/\d+)?)/)?.[1]
    if (!size) return null
    if (size.startsWith('#')) return Number(size.slice(1))

    if (size.includes('/')) {
        const mixedNumber = size.match(/^(\d+)\s+(\d+)\/(\d+)$/)
        const fraction = size.match(/^(\d+)\/(\d+)$/)
        if (mixedNumber) {
            return (Number(mixedNumber[1]) + Number(mixedNumber[2]) / Number(mixedNumber[3])) * 25.4
        }
        return (Number(fraction[1]) / Number(fraction[2])) * 25.4
    }

    return Number(size) * 25.4
}

function getDesignation(designator, standard, pitch) {
    const base = designator.replace(/-(?:ext|int)$/, '')
    // The diameter can be fractional (M1.2, M0.25), and the pitch is implied when the
    // designator omits it. Both forms have to normalise to one designation, otherwise the
    // same thread reaches the table twice under two spellings.
    if (standard.id === 'metric') {
        return base.replace(
            /^M([\d.]+)(?:x([\d.]+))?$/,
            (_, diameter, entryPitch) => `M${diameter} x ${entryPitch || pitch}`,
        )
    }

    // Drop the series prefix: the standard is already named alongside the size, so
    // '8-UN-1 1/16' reads as '1 1/16' under the 8-UN standard.
    return base.replace(/^(?:UNC|UNF|UNEF|\d+-UN)-/, '')
}

const translated = entries
    .filter(([designator]) => designator.endsWith('-ext'))
    .map(([sourceDesignator, [pitch, rotationRadius, supportDiameter]]) => {
        const standard = getStandard(sourceDesignator)
        if (!standard) return null

        const baseDesignator = sourceDesignator.replace(/-ext$/, '')
        const designation = getDesignation(sourceDesignator, standard, pitch)
        const nominalDiameterMm = parseNominalDiameterMm(sourceDesignator, standard)
        const threadsPerInch = standard.system === 'imperial' && pitch > 0 ? 25.4 / pitch : null
        // '#' has to survive normalisation: UNC-#1 (a machine screw) and UNC-1 (a 1 inch
        // bolt) are different threads that would otherwise both become `unc-1-external`.
        const slug = baseDesignator
            .toLowerCase()
            .replace(/#/g, 'no-')
            .replace(/[^a-z0-9]+/g, '-')
        const id = `${standard.id}-${slug}-external`

        return {
            id,
            standardId: standard.id,
            designation,
            label: `${designation} ${standard.label}`,
            nominalDiameterMm,
            pitch,
            threadsPerInch,
            angle: standard.angle,
            threadSide: 'external',
            sourceDesignator,
            rotationRadiusMm: rotationRadius,
            supportDiameterMm: supportDiameter,
        }
    })
    .filter(Boolean)

// threadlib lists coarse threads twice: once with an implied pitch (M6-ext) and once
// with it spelled out (M6x1-ext). Both rows describe the same thread with identical
// geometry, so collapse them and keep the shorthand designator.
const byThread = new Map()

for (const entry of translated) {
    const key = `${entry.standardId}|${entry.designation}|${entry.pitch}|${entry.threadSide}`
    const existing = byThread.get(key)

    if (!existing || entry.sourceDesignator.length < existing.sourceDesignator.length) {
        byThread.set(key, entry)
    }
}

const uniqueEntries = [...byThread.values()]
const duplicateIdCount = uniqueEntries.length - new Set(uniqueEntries.map((entry) => entry.id)).size

if (duplicateIdCount > 0) {
    throw new Error(`Refusing to write ${duplicateIdCount} entries that share an id`)
}

const usedStandardIds = new Set(uniqueEntries.map((entry) => entry.standardId))
const standards = Object.values(standardDefinitions).filter((standard) => usedStandardIds.has(standard.id))

const output = `// Generated from threadlib THREAD_TABLE.scad. Do not edit by hand.\n// Source: https://github.com/adrianschlatter/threadlib\n// License: BSD-3-Clause; see THIRD_PARTY_LICENSES.md\n\nexport const threadStandards = Object.freeze(${JSON.stringify(standards, null, 2)})\n\nexport const threadDatabase = Object.freeze(${JSON.stringify(uniqueEntries, null, 2)})\n`

await writeFile(outputPath, output)
console.log(
    `Generated ${uniqueEntries.length} external thread entries across ${standards.length} standards` +
        ` (${translated.length - uniqueEntries.length} duplicate rows collapsed).`,
)
