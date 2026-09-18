import { deflateSync } from 'node:zlib'
import { writeFile } from 'node:fs/promises'

// The app icon is a thread profile in cross-section with two wires seated in the grooves
// and the measurement spanning their outer tangent -- the measure-over-wires the app exists
// to calculate. Geometry is defined once here and mirrored by hand in public/favicon.svg.
//
// There is no rasteriser on the toolchain (no rsvg-convert, ImageMagick or sharp), so the
// PNGs are drawn by supersampling the shapes below and encoded directly.

const BASE = 512

const BACKGROUND = [2, 6, 23, 255] // slate-950, matches the app shell
const THREAD = [148, 163, 184, 255] // slate-400, the steel
const WIRE = [59, 130, 246, 255] // blue-500, the app's accent
const MEASURE = [241, 245, 249, 255] // slate-100

// A four-groove profile: crests at y=216, roots at y=306, body closed off at y=396.
const THREAD_PROFILE = [
    [40, 216], [94, 306], [148, 216], [202, 306], [256, 216],
    [310, 306], [364, 216], [418, 306], [472, 216], [472, 396], [40, 396],
]

// Seated in the outermost grooves. A wire of radius r in a groove of half-angle a rests
// r/sin(a) above the root; these flanks give a = atan(54/90), so the drop is ~105.
const WIRE_RADIUS = 54
const WIRES = [[94, 201], [418, 201]]

// The span line is tangent to the wire crowns, with witness ticks at each end.
const MEASURE_BAR = [40, 144, 472, 150] // centred on the wire crowns at y=147
const MEASURE_TICKS = [[37, 116, 43, 178], [469, 116, 475, 178]]

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
    const bar = [...at(MEASURE_BAR[0], MEASURE_BAR[1]), ...at(MEASURE_BAR[2], MEASURE_BAR[3])]
    const ticks = MEASURE_TICKS.map(([x0, y0, x1, y1]) => [...at(x0, y0), ...at(x1, y1)])

    return [
        { colour: THREAD, covers: (x, y) => insidePolygon(profile, x, y) },
        ...wires.map((wire) => ({ colour: WIRE, covers: (x, y) => insideCircle(wire, x, y) })),
        { colour: MEASURE, covers: (x, y) => insideRect(bar, x, y) },
        ...ticks.map((tick) => ({ colour: MEASURE, covers: (x, y) => insideRect(tick, x, y) })),
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
