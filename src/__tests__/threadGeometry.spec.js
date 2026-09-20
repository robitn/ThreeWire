import { describe, it, expect } from 'vitest'

import {
  basicPitchDiameterMm,
  bestWireDiameterMm,
  measurementOverWiresMm,
  pitchDiameterOverWiresMm,
  sizeOf,
} from '../lib/threadGeometry'
import { threadDatabase, threadStandards } from '../data/threadDatabase'

const standard = (id) => threadStandards.find((entry) => entry.id === id)
const thread = (id) => threadDatabase.find((entry) => entry.id === id)

const MM_PER_INCH = 25.4
const inch = (mm) => mm / MM_PER_INCH

describe('sizeOf', () => {
  it('strips the pitch from a metric designation and leaves the rest alone', () => {
    expect(sizeOf({ designation: 'M6 x 1' })).toBe('M6')
    expect(sizeOf({ designation: 'M0.25 x 0.075' })).toBe('M0.25')
    expect(sizeOf({ designation: '1/4' })).toBe('1/4')
    expect(sizeOf({ designation: '#1' })).toBe('#1')
    expect(sizeOf({ designation: 'G1/2' })).toBe('G1/2')
  })
})

describe('basicPitchDiameterMm', () => {
  it('matches the published basic pitch diameters', () => {
    expect(inch(basicPitchDiameterMm(thread('unc-unc-1-4-external'), standard('unc')))).toBeCloseTo(
      0.2175,
      4,
    )
    expect(basicPitchDiameterMm(thread('metric-m6-external'), standard('metric'))).toBeCloseTo(
      5.35,
      3,
    )
    expect(basicPitchDiameterMm(thread('bsp-g1-2-external'), standard('bsp'))).toBeCloseTo(19.793, 3)
  })

  it('has nothing to give for a standard with no pitch diameter factor', () => {
    expect(basicPitchDiameterMm(thread('unc-unc-1-4-external'), { angle: 60 })).toBeNull()
  })
})

describe('bestWireDiameterMm', () => {
  it('is P / (2 cos(half angle)) at both thread angles in the catalog', () => {
    // 60 deg: 0.57735 P. 1/4-20 UNC has a 1.27 mm pitch.
    expect(bestWireDiameterMm(thread('unc-unc-1-4-external'))).toBeCloseTo(0.57735 * 1.27, 5)
    // 55 deg: 0.56369 P. G1/2 BSP has a 1.814 mm pitch.
    expect(bestWireDiameterMm(thread('bsp-g1-2-external'))).toBeCloseTo(0.563693 * 1.814, 5)
  })
})

describe('the three-wire relation', () => {
  const uncQuarter = thread('unc-unc-1-4-external')
  const bspHalf = thread('bsp-g1-2-external')

  // The coefficients follow the thread angle. At 60 degrees they collapse to the familiar
  // handbook pair, which is the coincidence that hid the error in the 55 degree form.
  it('reduces to 3W - 0.86603P on a 60 degree thread', () => {
    const wire = 0.7
    const pitchDiameter = 5.5
    const handbook = pitchDiameter + 3 * wire - 0.8660254 * uncQuarter.pitch

    expect(measurementOverWiresMm(pitchDiameter, uncQuarter, wire)).toBeCloseTo(handbook, 7)
  })

  it('uses 3.16568W - 0.96049P on a 55 degree thread', () => {
    const wire = bestWireDiameterMm(bspHalf)
    const pitchDiameter = 19.793
    const handbook = pitchDiameter + 3.165681 * wire - 0.960491 * bspHalf.pitch

    expect(measurementOverWiresMm(pitchDiameter, bspHalf, wire)).toBeCloseTo(handbook, 5)
  })

  // The form this replaced used cos(b) for the pitch term and a flat 3 for the wire term.
  // cos(b) equals cot(b)/2 only at b = 30 degrees, so the old form was right at 60 degrees
  // by coincidence and wrong at every other thread angle.
  it('parts company with the old 3W - P cos(b) form on a 55 degree thread', () => {
    const wire = bestWireDiameterMm(bspHalf)
    const halfAngle = (bspHalf.angle / 2) * (Math.PI / 180)
    const oldForm = 19.793 + 3 * wire - Math.cos(halfAngle) * bspHalf.pitch
    const correct = measurementOverWiresMm(19.793, bspHalf, wire)

    // About 0.036 mm on G1/2, and it grows with pitch: more than a thou of gage error.
    expect(correct - oldForm).toBeCloseTo(0.0361, 3)
    expect(inch(correct - oldForm)).toBeGreaterThan(0.001)
  })

  it('inverts exactly', () => {
    for (const entry of [uncQuarter, bspHalf, thread('metric-m6-external')]) {
      const wire = bestWireDiameterMm(entry)
      const measurement = measurementOverWiresMm(5.5, entry, wire)

      expect(pitchDiameterOverWiresMm(measurement, entry, wire)).toBeCloseTo(5.5, 12)
    }
  })
})
