import { describe, it, expect } from 'vitest'

import {
  class2AToleranceInch,
  isoDeviationUm,
  isoToleranceUm,
  computeUnifiedLimitsInch,
  lookupUnifiedLimitsInch,
  pitchDiameterLimitsMm,
} from '../lib/threadLimits'
import { unifiedClassLimitsInch } from '../data/unifiedClassLimits'
import { threadDatabase, threadStandards } from '../data/threadDatabase'

const MM_PER_INCH = 25.4
const inch = (mm) => mm / MM_PER_INCH
const standard = (id) => threadStandards.find((entry) => entry.id === id)
const thread = (id) => threadDatabase.find((entry) => entry.id === id)
const round4 = (value) => Math.round(value * 1e4) / 1e4
const round3 = (value) => Math.round(value * 1e3) / 1e3

describe('unifiedClassLimitsInch', () => {
  // Every basic pitch diameter in the table has to be d - 0.649519 * P. It is the one
  // column that can be derived, so it is the check that the rest was transcribed correctly.
  it('agrees with the basic pitch diameter formula on every row', () => {
    const wrong = Object.entries(unifiedClassLimitsInch).filter(([key, limits]) => {
      const [diameter, threadsPerInch] = key.split('-')
      return round4(Number(diameter) - 0.649519 / Number(threadsPerInch)) !== limits.basic
    })

    expect(wrong).toEqual([])
  })

  it('orders every row as 2A min < 2A max < basic and 3A min < basic', () => {
    const wrong = Object.entries(unifiedClassLimitsInch).filter(
      ([, l]) =>
        !(l.class2AMin < l.class2AMax && l.class2AMax < l.basic && l.class2AMin < l.class3AMin),
    )

    expect(wrong).toEqual([])
  })
})

describe('lookupUnifiedLimitsInch', () => {
  it('reads 5/8-11 UNC straight out of the standard table', () => {
    expect(lookupUnifiedLimitsInch(0.625, 11)).toEqual({
      basic: 0.566,
      class2AMax: 0.5644,
      class2AMin: 0.5589,
      class3AMin: 0.5619,
      source: 'table',
    })
  })

  // The table is keyed by geometry, so a thread reached through the constant-pitch series
  // gets the same limits as the same thread reached through UNC.
  it('resolves the same thread under a different series name', () => {
    expect(lookupUnifiedLimitsInch(1, 8)).toEqual(lookupUnifiedLimitsInch(1.0, 8.000001))
    expect(lookupUnifiedLimitsInch(1, 8).source).toBe('table')
  })

  it('marks a size the table does not carry as computed', () => {
    expect(lookupUnifiedLimitsInch(2, 8).source).toBe('formula')
  })
})

describe('computeUnifiedLimitsInch', () => {
  // Class 2A carries a clearance allowance of 0.3 of its own tolerance; Class 3A has none,
  // so it starts at the basic size and is 0.75 as wide.
  it('applies the allowance to Class 2A and none to Class 3A', () => {
    const majorDiameter = 2
    const threadsPerInch = 8
    const limits = computeUnifiedLimitsInch(majorDiameter, threadsPerInch)
    const tolerance2A = round4(class2AToleranceInch(majorDiameter, 1 / threadsPerInch))

    expect(limits.class2AMax).toBe(round4(limits.basic - round4(0.3 * tolerance2A)))
    expect(limits.class2AMin).toBe(round4(limits.class2AMax - tolerance2A))
    expect(limits.class3AMin).toBe(round4(limits.basic - round4(0.75 * tolerance2A)))
    expect(limits.class2AMax).toBeLessThan(limits.basic)
  })
})

describe('pitchDiameterLimitsMm', () => {
  const uncFiveEighths = threadDatabase.find(
    (entry) => entry.standardId === 'unc' && entry.designation === '5/8',
  )

  it('gives the published Class 2A range for 5/8-11 UNC', () => {
    const limits = pitchDiameterLimitsMm(uncFiveEighths, standard('unc'), '2A')

    expect(inch(limits.minMm)).toBeCloseTo(0.5589, 4)
    expect(inch(limits.maxMm)).toBeCloseTo(0.5644, 4)
    expect(limits.source).toBe('table')
  })

  it('gives the published Class 3A range for 5/8-11 UNC', () => {
    const limits = pitchDiameterLimitsMm(uncFiveEighths, standard('unc'), '3A')

    expect(inch(limits.minMm)).toBeCloseTo(0.5619, 4)
    // No allowance, so the maximum is the basic pitch diameter.
    expect(inch(limits.maxMm)).toBeCloseTo(0.566, 4)
  })

  it('has no limits to give without a class', () => {
    expect(pitchDiameterLimitsMm(uncFiveEighths, standard('unc'), 'basic')).toBeNull()
  })

  // A class id only means something inside its own system: metric threads answer to ISO 965
  // and BSP to neither, so asking for a 2A fit there has to come back empty.
  it('refuses a class from another standard\'s system', () => {
    expect(pitchDiameterLimitsMm(thread('metric-m6-external'), standard('metric'), '2A')).toBeNull()
    expect(pitchDiameterLimitsMm(thread('bsp-g1-2-external'), standard('bsp'), '2A')).toBeNull()
  })
})

// Published external pitch diameter limits in mm: [d, P, 6g max, 6g min, 6h max, 6h min].
// Cross-checked between three gage charts that agree on every 6g value, and the source of
// the data in isoClassLimits.js is a fourth, independent one -- the standard's own tables.
// Reproducing all of these is what says the two were transcribed correctly.
const ISO_GAGE_CHART = [
  [1.6, 0.35, 1.354, 1.291, 1.373, 1.310],
  [2, 0.4, 1.721, 1.654, 1.740, 1.673],
  [2.5, 0.45, 2.188, 2.117, 2.208, 2.137],
  [3, 0.5, 2.655, 2.580, 2.675, 2.600],
  [3.5, 0.6, 3.089, 3.004, 3.110, 3.025],
  [4, 0.7, 3.523, 3.433, 3.545, 3.455],
  [5, 0.8, 4.456, 4.361, 4.480, 4.385],
  [6, 1, 5.324, 5.212, 5.350, 5.238],
  [8, 1.25, 7.160, 7.042, 7.188, 7.070],
  [8, 1, 7.324, 7.212, 7.350, 7.238],
  [10, 1.5, 8.994, 8.862, 9.026, 8.894],
  [10, 1.25, 9.160, 9.042, 9.188, 9.070],
  [10, 1, 9.324, 9.212, 9.350, 9.238],
  [10, 0.75, 9.491, 9.391, 9.513, 9.413],
  [12, 1.75, 10.829, 10.679, 10.863, 10.713],
  [12, 1.5, 10.994, 10.854, 11.026, 10.886],
  [12, 1.25, 11.160, 11.028, 11.188, 11.056],
  [12, 1, 11.324, 11.206, 11.350, 11.232],
  [14, 2, 12.663, 12.503, 12.701, 12.541],
  [14, 1.5, 12.994, 12.854, 13.026, 12.886],
  [15, 1, 14.324, 14.206, 14.350, 14.232],
  [16, 2, 14.663, 14.503, 14.701, 14.541],
  [16, 1.5, 14.994, 14.854, 15.026, 14.886],
  [17, 1, 16.324, 16.206, 16.350, 16.232],
  [18, 1.5, 16.994, 16.854, 17.026, 16.886],
  [20, 2.5, 18.334, 18.164, 18.376, 18.206],
  [20, 1.5, 18.994, 18.854, 19.026, 18.886],
  [20, 1, 19.324, 19.206, 19.350, 19.232],
  [22, 2.5, 20.334, 20.164, 20.376, 20.206],
  [22, 1.5, 20.994, 20.854, 21.026, 20.886],
  [24, 3, 22.003, 21.803, 22.051, 21.851],
  [24, 2, 22.663, 22.493, 22.701, 22.531],
  [25, 1.5, 23.994, 23.844, 24.026, 23.876],
  [27, 3, 25.003, 24.803, 25.051, 24.851],
  [27, 2, 25.663, 25.493, 25.701, 25.531],
  [30, 3.5, 27.674, 27.462, 27.727, 27.515],
  [30, 2, 28.663, 28.493, 28.701, 28.531],
  [30, 1.5, 28.994, 28.844, 29.026, 28.876],
  [33, 2, 31.663, 31.493, 31.701, 31.531],
  [35, 1.5, 33.994, 33.844, 34.026, 33.876],
  [36, 4, 33.342, 33.118, 33.402, 33.178],
  [36, 2, 34.663, 34.493, 34.701, 34.531],
  [39, 2, 37.663, 37.493, 37.701, 37.531],
  [40, 1.5, 38.994, 38.844, 39.026, 38.876],
]

const metricStandard = { threadClassSystem: 'iso-965' }
const metricThread = (nominalDiameterMm, pitch) => ({ nominalDiameterMm, pitch })
const isoLimits = (d, P, classId) =>
  pitchDiameterLimitsMm(metricThread(d, P), metricStandard, classId)

describe('ISO 965 class limits', () => {
  it('reproduces the published 6g limits for every charted size', () => {
    const wrong = ISO_GAGE_CHART.filter(([d, P, max, min]) => {
      const limits = isoLimits(d, P, '6g')
      return !limits || round3(limits.maxMm) !== max || round3(limits.minMm) !== min
    }).map(([d, P]) => `M${d}x${P}`)

    expect(wrong).toEqual([])
  })

  // Position h has zero fundamental deviation, so its maximum is the basic pitch diameter
  // and the whole class sits below the theoretical size rather than astride it.
  it('reproduces the published 6h limits for every charted size', () => {
    const wrong = ISO_GAGE_CHART.filter(([d, P, , , max, min]) => {
      const limits = isoLimits(d, P, '6h')
      return !limits || round3(limits.maxMm) !== max || round3(limits.minMm) !== min
    }).map(([d, P]) => `M${d}x${P}`)

    expect(wrong).toEqual([])
  })

  it('opens position h at the basic pitch diameter and position g below it', () => {
    ISO_GAGE_CHART.forEach(([d, P]) => {
      expect(round3(isoLimits(d, P, '6h').maxMm)).toBe(round3(d - 0.649519 * P))
      expect(isoLimits(d, P, '6g').maxMm).toBeLessThan(isoLimits(d, P, '6h').maxMm)
    })
  })

  // The tolerance is the grade's; the position only shifts where the band sits.
  it('gives 6g and 6h the same width', () => {
    ISO_GAGE_CHART.forEach(([d, P]) => {
      const g = isoLimits(d, P, '6g')
      const h = isoLimits(d, P, '6h')
      expect(round3(g.maxMm - g.minMm)).toBe(round3(h.maxMm - h.minMm))
    })
  })

  it('gives M6 x 1 the ISO 965 4h range', () => {
    const limits = isoLimits(6, 1, '4h')

    // Basic 5.350, no allowance at h, grade 4 tolerance 71 um.
    expect(round3(limits.maxMm)).toBe(5.35)
    expect(round3(limits.minMm)).toBe(5.279)
  })

  it('makes 4h tighter than 6g and puts it higher up', () => {
    const close = isoLimits(6, 1, '4h')
    const general = isoLimits(6, 1, '6g')

    expect(close.maxMm - close.minMm).toBeLessThan(general.maxMm - general.minMm)
    expect(close.minMm).toBeGreaterThan(general.minMm)
  })

  it('has the fundamental deviations the standard lists, not the -(15 + 11P) estimate', () => {
    // Where the two differ, the table wins: the estimate gives -37 and -59 here.
    expect(isoDeviationUm(2, 'g')).toBe(-38)
    expect(isoDeviationUm(4, 'g')).toBe(-60)
    expect(isoDeviationUm(1, 'h')).toBe(0)
  })

  it('has the tabulated tolerance where the R40 rounding is not reproducible', () => {
    // 90 * 0.5^0.4 * 3.9598^0.1 rounds to 80 um, but the standard tabulates 75.
    expect(isoToleranceUm(3, 0.5, 6)).toBe(75)
  })

  // ISO 965-1 starts at 0.99 mm, so the sub-millimetre threads in the catalog get nothing
  // rather than an extrapolated band.
  it('has no class for a thread below the range of ISO 965-1', () => {
    expect(isoLimits(0.25, 0.075, '6g')).toBeNull()
  })
})
