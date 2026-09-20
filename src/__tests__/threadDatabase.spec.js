import { describe, it, expect } from 'vitest'

import { threadDatabase, threadStandards } from '../data/threadDatabase'

function duplicatesBy(project) {
  const seen = new Map()

  for (const thread of threadDatabase) {
    const key = project(thread)
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }

  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key)
}

describe('threadDatabase', () => {
  it('has no duplicate ids', () => {
    expect(duplicatesBy((thread) => thread.id)).toEqual([])
  })

  // threadlib lists coarse threads twice, e.g. M6-ext and M6x1-ext. Collapsing them on id
  // alone is not enough, because the two rows carry different ids.
  it('has no two entries describing the same thread', () => {
    expect(
      duplicatesBy((thread) => `${thread.standardId}|${thread.designation}|${thread.pitch}`),
    ).toEqual([])
  })

  it('has no duplicate labels within a standard', () => {
    expect(duplicatesBy((thread) => `${thread.standardId}|${thread.label}`)).toEqual([])
  })

  it('keeps machine screw sizes separate from inch sizes', () => {
    const screw = threadDatabase.find((thread) => thread.id === 'unc-unc-no-1-external')
    const bolt = threadDatabase.find((thread) => thread.id === 'unc-unc-1-external')

    expect(screw.designation).toBe('#1')
    expect(bolt.designation).toBe('1')
    expect(screw.pitch).not.toBe(bolt.pitch)
  })

  // A '#' size counts screw sizes rather than measuring one, so it cannot be read as a
  // length: #1 is 0.073 in across, not 1 mm.
  it('resolves machine screw numbers to a diameter', () => {
    const screw = threadDatabase.find((thread) => thread.id === 'unc-unc-no-1-external')

    expect(screw.nominalDiameterMm).toBeCloseTo(1.8542, 4)
  })

  // '8-UN-1' is a 1 inch thread in the 8 threads-per-inch series, not an 8 inch thread.
  it('does not read the series prefix of a UN standard as a size', () => {
    const thread = threadDatabase.find((thread) => thread.id === '8-un-8-un-1-external')

    expect(thread.designation).toBe('1')
    expect(thread.nominalDiameterMm).toBeCloseTo(25.4, 4)
  })

  // A G designation names a pipe bore, so the diameter comes from ISO 228-1 rather than
  // from the designator.
  it('carries the catalogued diameter of a BSP thread', () => {
    const thread = threadDatabase.find((thread) => thread.id === 'bsp-g1-2-external')

    expect(thread.nominalDiameterMm).toBe(20.955)
  })

  it('gives every calculable standard a pitch diameter factor', () => {
    const calculable = threadStandards.filter((standard) => standard.angle !== null)

    expect(calculable.length).toBeGreaterThan(0)
    expect(calculable.every((standard) => standard.pitchDiameterFactor > 0)).toBe(true)
  })

  // Nothing downstream can work out a pitch diameter without one.
  it('gives every thread of a calculable standard a nominal diameter', () => {
    const calculable = new Set(
      threadStandards.filter((standard) => standard.angle !== null).map((standard) => standard.id),
    )
    const threads = threadDatabase.filter((thread) => calculable.has(thread.standardId))

    expect(threads.filter((thread) => !(thread.nominalDiameterMm > 0))).toEqual([])
  })

  // Classes of fit belong to a standard: the inch series follows ASME B1.1 and metric ISO
  // follows ISO 965. BSP runs its own system, which the calculator does not implement.
  it('points each standard at its own class system', () => {
    const asme = threadStandards.filter((s) => s.threadClassSystem === 'asme-b1.1')

    expect(asme.map((s) => s.id).sort()).toEqual(['4-un', '6-un', '8-un', 'unc', 'unef', 'unf'])
    expect(threadStandards.find((s) => s.id === 'metric').threadClassSystem).toBe('iso-965')
    expect(threadStandards.find((s) => s.id === 'bsp').threadClassSystem).toBeNull()
  })

  it('only references standards that exist', () => {
    const standardIds = new Set(threadStandards.map((standard) => standard.id))

    expect(threadDatabase.every((thread) => standardIds.has(thread.standardId))).toBe(true)
  })
})
