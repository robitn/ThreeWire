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

// Basic pitch diameter sits a fixed fraction of the sharp-V height H below the nominal
// diameter, and H is itself a fixed multiple of the pitch, so d2 = d - factor * P.
// The 60 deg forms (ISO 68-1, ASME B1.1) put the pitch line 3/8 H below the crest:
// 2 * (3/8) * 0.8660254. Whitworth's 55 deg form is rounded away by H/6 at crest and root,
// leaving the pitch line at half of the remaining depth: 2 * (1/3) * 0.9604915.
const UNIFIED_PITCH_DIAMETER_FACTOR = 0.649519
const WHITWORTH_PITCH_DIAMETER_FACTOR = 0.640327

// Classes of fit are per standard: the inch series follows ASME B1.1, metric ISO follows
// ISO 965. BSP has its own system again, which the calculator does not implement.
const unified = (id, label) => ({
    id,
    label,
    system: 'imperial',
    angle: 60,
    pitchDiameterFactor: UNIFIED_PITCH_DIAMETER_FACTOR,
    threadClassSystem: 'asme-b1.1',
})

const standardDefinitions = {
    metric: {
        id: 'metric',
        label: 'Metric ISO',
        system: 'metric',
        angle: 60,
        pitchDiameterFactor: UNIFIED_PITCH_DIAMETER_FACTOR,
        threadClassSystem: 'iso-965',
    },
    unc: unified('unc', 'UNC'),
    unf: unified('unf', 'UNF'),
    unef: unified('unef', 'UNEF'),
    '4-un': unified('4-un', '4-UN'),
    '6-un': unified('6-un', '6-UN'),
    '8-un': unified('8-un', '8-UN'),
    '12-un': unified('12-un', '12-UN'),
    '16-un': unified('16-un', '16-UN'),
    '20-un': unified('20-un', '20-UN'),
    '28-un': unified('28-un', '28-UN'),
    '32-un': unified('32-un', '32-UN'),
    bsp: {
        id: 'bsp',
        label: 'BSP parallel (G)',
        system: 'imperial',
        angle: 55,
        pitchDiameterFactor: WHITWORTH_PITCH_DIAMETER_FACTOR,
        threadClassSystem: null,
    },
    pco: {
        id: 'pco',
        label: 'Packaging thread',
        system: 'metric',
        angle: null,
        pitchDiameterFactor: null,
        threadClassSystem: null,
    },
    rms: {
        id: 'rms',
        label: 'RMS',
        system: 'imperial',
        angle: null,
        pitchDiameterFactor: null,
        threadClassSystem: null,
    },
}

// ISO 228-1 major diameters. A G designation names a pipe bore rather than a thread size,
// so unlike the metric and inch series the diameter cannot be read out of the designator.
const bspMajorDiameterMm = {
    'G1/16': 7.723,
    'G1/8': 9.728,
    'G1/4': 13.157,
    'G3/8': 16.662,
    'G1/2': 20.955,
    'G5/8': 22.911,
    'G3/4': 26.441,
    'G7/8': 30.201,
    G1: 33.249,
    'G1 1/8': 37.897,
    'G1 1/4': 41.91,
    'G1 1/2': 47.803,
    'G1 3/4': 53.746,
    G2: 59.614,
    'G2 1/4': 65.71,
    'G2 1/2': 75.184,
    'G2 3/4': 81.534,
    G3: 87.884,
    'G3 1/2': 100.33,
    G4: 113.03,
    'G4 1/2': 125.73,
    G5: 138.43,
    'G5 1/2': 151.13,
    G6: 163.83,
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
        return bspMajorDiameterMm[designator.replace(/-(?:ext|int)$/, '')] ?? null
    }

    // Drop the series prefix before looking for the size, or '8-UN-1' reads as an 8 inch
    // thread instead of a 1 inch one in the 8 threads-per-inch series.
    const size = designator
        .replace(/^(?:UNC|UNF|UNEF|\d+-UN)-/, '')
        .match(/(?:-|^)(#?\d+(?:[ /]\d+)?(?:\/\d+)?)/)?.[1]
    if (!size) return null
    // A number size counts screw sizes rather than measuring one: #N is 0.060 in across,
    // plus 0.013 in per number.
    if (size.startsWith('#')) return (0.06 + 0.013 * Number(size.slice(1))) * 25.4

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
