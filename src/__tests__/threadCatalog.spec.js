import { describe, it, expect } from 'vitest'

import {
  calculableStandards,
  pitchesForSize,
  restoreSelection,
  sizesInStandard,
  threadsInStandard,
} from '../lib/threadCatalog'
import { threadDatabase } from '../data/threadDatabase'

describe('calculableStandards', () => {
  // A standard with no thread angle cannot be measured over wires at all, so it must never
  // reach the picker. The catalog carries a few of those from the upstream table.
  it('leaves out the standards with no thread angle', () => {
    expect(calculableStandards.every((standard) => standard.angle !== null)).toBe(true)
    expect(calculableStandards.map((standard) => standard.id)).not.toContain('pco')
    expect(calculableStandards.map((standard) => standard.id)).not.toContain('rms')
    expect(threadDatabase.some((thread) => thread.standardId === 'pco')).toBe(true)
  })
})

describe('pitchesForSize', () => {
  it('lists a size coarsest first', () => {
    const pitches = pitchesForSize('metric', 'M6').map((thread) => thread.pitch)

    expect(pitches).toEqual([...pitches].sort((a, b) => b - a))
    expect(pitches[0]).toBe(1)
  })

  it('gives an inch size its single pitch', () => {
    expect(pitchesForSize('unc', '1/4').map((thread) => thread.designation)).toEqual(['1/4'])
  })
})

describe('sizesInStandard', () => {
  it('collapses a metric size that has several pitches into one entry', () => {
    const sizes = sizesInStandard('metric')

    expect(sizes.filter((size) => size === 'M6')).toHaveLength(1)
    expect(threadsInStandard('metric').filter((t) => t.designation.startsWith('M6 x')).length)
      .toBeGreaterThan(1)
  })
})

// Stored ids are re-validated on every load: the generated table can be regenerated out
// from under them, and the storage entry is user-editable in any case.
describe('restoreSelection', () => {
  it('returns the stored pair when both still exist', () => {
    const { standardId, thread } = restoreSelection({
      standardId: 'metric',
      threadId: 'metric-m6x0-8-external',
    })

    expect(standardId).toBe('metric')
    expect(thread.id).toBe('metric-m6x0-8-external')
  })

  it('falls back to the default standard when the stored one is unusable', () => {
    expect(restoreSelection({ standardId: 'no-such-standard' }).standardId).toBe('unc')
    // A standard that exists but cannot be calculated is no better than one that does not.
    expect(restoreSelection({ standardId: 'rms' }).standardId).toBe('unc')
  })

  it('keeps the standard but replaces a thread that does not belong to it', () => {
    const { standardId, thread } = restoreSelection({
      standardId: 'metric',
      threadId: 'unc-unc-1-4-external',
    })

    expect(standardId).toBe('metric')
    expect(thread.standardId).toBe('metric')
  })

  it('always returns a usable thread, even from nothing', () => {
    expect(restoreSelection().thread.id).toBe('unc-unc-1-4-external')
    expect(restoreSelection({}).thread.id).toBe('unc-unc-1-4-external')
  })
})
