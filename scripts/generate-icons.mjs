import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'

// The app icon is the three-wire measurement in a diametral section: a pair of wires in
// adjacent grooves on one flank, the third in the groove between them on the other, and the
// micrometer closing on the wire crowns -- the measure-over-wires the app exists to
// calculate. Geometry is defined once here, and public/favicon.svg is written from it.
//
// There is no rasteriser on the toolchain (no rsvg-convert, ImageMagick or sharp), so the
// PNGs are drawn by supersampling the shapes below and encoded directly.

const BASE = 512

const BACKGROUND = [2, 6, 23, 255] // slate-950, matches the app shell
const THREAD = [148, 163, 184, 255] // slate-400, the steel
const WIRE = [59, 130, 246, 255] // blue-500, the app's accent
const MEASURE = [241, 245, 249, 255] // slate-100

// The only numbers chosen by hand. Every point of the drawing is derived from them, so the
// proportions stay consistent if any one of them moves.
// DEPTH is FLANK_RUN / tan(30 deg), which makes the flanks a 60 degree included angle --
// the form of every thread the calculator handles bar BSP.
const PITCH = 80
const FLANK_RUN = PITCH / 2 // crest to root, horizontally
const DEPTH = 69 // crest to root, vertically
const WIRE_RADIUS = 32
const ANVIL_THICKNESS = 12

// A crest on the axis, two grooves either side of it, and the ends cut off square. The core
// left between the two root lines is a bit over twice the tooth depth, which is what makes
// the drawing read as a threaded bar rather than as a zigzag ribbon.
const BAR_X0 = 96
const BAR_X1 = 416 // five crests, so the flanks read as a thread
// Wider than the bar, so the micrometer reads as closing over it rather than sitting on it,
// and still inside the safe zone a maskable icon gets cropped to.
const ANVIL_X0 = 88
const ANVIL_X1 = 424

// The two crest lines sit symmetrically about the centre, so the bar has an axis and the
// drawing balances on it.
const TOP_CREST_Y = 115
const BOTTOM_CREST_Y = BASE - TOP_CREST_Y
const TOP_ROOT_Y = TOP_CREST_Y + DEPTH
const BOTTOM_ROOT_Y = BOTTOM_CREST_Y - DEPTH

// A wire rests on the flanks, not in the root: one of radius r in a groove of half-angle a
// seats r/sin(a) out from the root, which is what holds its crown clear of the crests for
// the micrometer to reach. These flanks give sin(a) = FLANK_RUN / hypot(FLANK_RUN, DEPTH).
const SEAT = (WIRE_RADIUS * Math.hypot(FLANK_RUN, DEPTH)) / FLANK_RUN
const TOP_WIRE_Y = TOP_ROOT_Y - SEAT
const BOTTOM_WIRE_Y = BOTTOM_ROOT_Y + SEAT

// Walks the triangular wave of one thread surface. The top starts on a crest, which puts a
// crest on the axis of the drawing; the bottom starts on a root, so it is half a pitch out
// of step -- which is how the two sides of a real single-start thread meet a section.
function surfacePoints(crestY, rootY, startOnRoot) {
    const points = []

    for (let x = BAR_X0, onRoot = startOnRoot; x <= BAR_X1; x += FLANK_RUN, onRoot = !onRoot) {
        points.push([x, onRoot ? rootY : crestY])
    }

    return points
}

const TOP_SURFACE = surfacePoints(TOP_CREST_Y, TOP_ROOT_Y, false)
const BOTTOM_SURFACE = surfacePoints(BOTTOM_CREST_Y, BOTTOM_ROOT_Y, true)

// One body, bounded above and below by its own thread surface.
const THREAD_PROFILE = [...TOP_SURFACE, ...[...BOTTOM_SURFACE].reverse()]

// The pair go in the grooves either side of the centre crest. The third goes in the groove
// the bottom surface puts on the axis, which is the one between them.
const WIRES = [
    [BASE / 2 - FLANK_RUN, TOP_WIRE_Y],
    [BASE / 2 + FLANK_RUN, TOP_WIRE_Y],
    [BASE / 2, BOTTOM_WIRE_Y],
]

// Tangent to the wire crowns on each side: the measurement over wires itself.
const ANVILS = [
    [ANVIL_X0, TOP_WIRE_Y - WIRE_RADIUS - ANVIL_THICKNESS, ANVIL_X1, TOP_WIRE_Y - WIRE_RADIUS],
    [ANVIL_X0, BOTTOM_WIRE_Y + WIRE_RADIUS, ANVIL_X1, BOTTOM_WIRE_Y + WIRE_RADIUS + ANVIL_THICKNESS],
]

function insidePolygon(points, x, y) {
    let inside = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]
        const [xj, yj] = points[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

function insideCircle([cx, cy, r], x, y) {
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function insideRect([x0, y0, x1, y1], x, y) {
    return x >= x0 && x <= x1 && y >= y0 && y <= y1
}

// Painter's algorithm, back to front. Each entry reports whether it covers a sample point.
function buildLayers(scale) {
    const centre = BASE / 2
    const at = (x, y) => [centre + (x - centre) / scale, centre + (y - centre) / scale]
    const scaled = ([x, y]) => at(x, y)

    const profile = THREAD_PROFILE.map(scaled)
    const wires = WIRES.map(([x, y]) => [...at(x, y), WIRE_RADIUS / scale])
    const anvils = ANVILS.map(([x0, y0, x1, y1]) => [...at(x0, y0), ...at(x1, y1)])

    return [
        { colour: THREAD, covers: (x, y) => insidePolygon(profile, x, y) },
        ...wires.map((wire) => ({ colour: WIRE, covers: (x, y) => insideCircle(wire, x, y) })),
        ...anvils.map((anvil) => ({ colour: MEASURE, covers: (x, y) => insideRect(anvil, x, y) })),
    ]
}

// 4x4 supersampling stands in for anti-aliasing; the shapes are large and flat enough that
// nothing finer is warranted.
const SAMPLES = 4

function render(size, scale) {
    const layers = buildLayers(scale)
    const pixels = Buffer.alloc(size * size * 4)

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            const coverage = layers.map(() => 0)
            for (let sy = 0; sy < SAMPLES; sy++) {
                for (let sx = 0; sx < SAMPLES; sx++) {
                    const x = ((px * SAMPLES + sx + 0.5) * BASE) / (size * SAMPLES)
                    const y = ((py * SAMPLES + sy + 0.5) * BASE) / (size * SAMPLES)
                    for (let i = 0; i < layers.length; i++) {
                        if (layers[i].covers(x, y)) coverage[i]++
                    }
                }
            }

            const total = SAMPLES * SAMPLES
            let [r, g, b] = BACKGROUND
            for (let i = 0; i < layers.length; i++) {
                const alpha = coverage[i] / total
                if (!alpha) continue
                const [lr, lg, lb] = layers[i].colour
                r += (lr - r) * alpha
                g += (lg - g) * alpha
                b += (lb - b) * alpha
            }

            const offset = (py * size + px) * 4
            pixels[offset] = Math.round(r)
            pixels[offset + 1] = Math.round(g)
            pixels[offset + 2] = Math.round(b)
            pixels[offset + 3] = 255
        }
    }

    return pixels
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
})

function crc32(buffer) {
    let c = 0xffffffff
    for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
}

function encodePng(size, pixels) {
    const header = Buffer.alloc(13)
    header.writeUInt32BE(size, 0)
    header.writeUInt32BE(size, 4)
    header[8] = 8 // bit depth
    header[9] = 6 // colour type: RGBA
    // 10-12: deflate, adaptive filtering, no interlace -- all zero.

    // One filter byte per scanline; filter 0 (none) compresses fine for flat colour.
    const raw = Buffer.alloc(size * (size * 4 + 1))
    for (let y = 0; y < size; y++) {
        raw[y * (size * 4 + 1)] = 0
        pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ])
}

// Maskable icons are cropped to a circle by the launcher, so their content is pulled into
// the safe zone; every other icon is drawn full bleed.
const OUTPUTS = [
    { file: 'public/pwa-64x64.png', size: 64, scale: 1 },
    { file: 'public/pwa-192x192.png', size: 192, scale: 1 },
    { file: 'public/pwa-512x512.png', size: 512, scale: 1 },
    { file: 'public/apple-touch-icon.png', size: 180, scale: 1 },
    { file: 'public/maskable-icon-512x512.png', size: 512, scale: 1.25 },
]

for (const { file, size, scale } of OUTPUTS) {
    await writeFile(file, encodePng(size, render(size, scale)))
    console.log(`wrote ${file} (${size}x${size})`)
}

// The favicon is the same drawing as vector rather than a second copy of it: keeping the two
// in step by hand was one transcription too many.
function hex([r, g, b]) {
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function buildSvg() {
    const round = (value) => Number(value.toFixed(2))

    const path = THREAD_PROFILE.map(
        ([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`,
    ).join(' ')

    const wires = WIRES.map(
        ([x, y]) =>
            `  <circle cx="${round(x)}" cy="${round(y)}" r="${WIRE_RADIUS}" fill="${hex(WIRE)}"/>`,
    )

    const anvils = ANVILS.map(
        ([x0, y0, x1, y1]) =>
            `  <rect x="${round(x0)}" y="${round(y0)}" width="${round(x1 - x0)}"` +
            ` height="${round(y1 - y0)}" fill="${hex(MEASURE)}"/>`,
    )

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BASE} ${BASE}" role="img" aria-label="ThreeWire">`,
        '  <!-- Generated by scripts/generate-icons.mjs from the geometry at the top of that',
        '       file. Do not edit by hand. -->',
        `  <rect width="${BASE}" height="${BASE}" fill="${hex(BACKGROUND)}"/>`,
        `  <path fill="${hex(THREAD)}" d="${path}Z"/>`,
        ...wires,
        ...anvils,
        '</svg>',
        '',
    ].join('\n')
}

await writeFile('public/favicon.svg', buildSvg())
console.log('wrote public/favicon.svg')
