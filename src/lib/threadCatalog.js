import { threadDatabase, threadStandards } from '../data/threadDatabase'
import { sizeOf } from './threadGeometry'

// Queries over the generated catalog. A standard with no thread angle cannot be measured
// over wires at all, so those never reach the UI.

const DEFAULT_STANDARD_ID = 'unc'
const DEFAULT_THREAD_ID = 'unc-unc-1-4-external'

export const calculableStandards = Object.freeze(
  threadStandards.filter((standard) => standard.angle !== null),
)

export function standardById(standardId) {
  return threadStandards.find((standard) => standard.id === standardId)
}

export function threadsInStandard(standardId) {
  return threadDatabase.filter(
    (thread) => thread.standardId === standardId && thread.angle !== null,
  )
}

export function sizesInStandard(standardId) {
  return [...new Set(threadsInStandard(standardId).map(sizeOf))]
}

// Coarsest first, which is how a size's pitches are normally listed.
export function pitchesForSize(standardId, size) {
  return threadsInStandard(standardId)
    .filter((thread) => sizeOf(thread) === size)
    .sort((first, second) => second.pitch - first.pitch)
}

export function threadById(threadId) {
  return threadDatabase.find((thread) => thread.id === threadId)
}

function findThread(threadId, standardId) {
  return threadsInStandard(standardId).find((thread) => thread.id === threadId)
}

/**
 * Resolve a stored standard and thread back to real catalog entries. Every stored value is
 * re-validated: ids can disappear when the generated table is regenerated, and the entry is
 * user-editable in any case. Always returns a usable pair, so the rest of the app can treat
 * a selected thread as always present.
 */
export function restoreSelection(stored = {}) {
  const standardId = calculableStandards.some((standard) => standard.id === stored.standardId)
    ? stored.standardId
    : DEFAULT_STANDARD_ID

  const thread =
    findThread(stored.threadId, standardId) ??
    findThread(DEFAULT_THREAD_ID, standardId) ??
    threadsInStandard(standardId)[0]

  return { standardId, thread }
}
