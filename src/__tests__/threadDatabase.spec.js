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

  it('only references standards that exist', () => {
    const standardIds = new Set(threadStandards.map((standard) => standard.id))

    expect(threadDatabase.every((thread) => standardIds.has(thread.standardId))).toBe(true)
  })
})
