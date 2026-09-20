import { unifiedClassLimitsInch } from '../data/unifiedClassLimits'
import { isoFundamentalDeviationsUm, isoPitchDiameterTolerancesUm } from '../data/isoClassLimits'

const MM_PER_INCH = 25.4

// Every standard that has a class system gets its own list. ASME B1.1 leaves out 1A, which
// is rare; ISO 965 offers 6g, the general purpose fit, and 4h, the close one. Both start
// with 'basic', meaning no class and nothing but the theoretical size.
const BASIC_CLASS = { id: 'basic', label: 'Basic', short: 'Basic' }

export const THREAD_CLASS_SYSTEMS = Object.freeze({
  'asme-b1.1': {
    defaultClassId: '2A',
    classes: [
      BASIC_CLASS,
      { id: '2A', label: 'Class 2A', short: '2A' },
      { id: '3A', label: 'Class 3A', short: '3A' },
    ],
  },
  'iso-965': {
    defaultClassId: '6g',
    classes: [
      BASIC_CLASS,
      { id: '6g', label: '6g (general purpose)', short: '6g' },
      { id: '4h', label: '4h (close)', short: '4h' },
    ],
  },
})

export function threadClassesFor(standard) {
  return THREAD_CLASS_SYSTEMS[standard?.threadClassSystem]?.classes ?? []
}

export function defaultClassId(systemId) {
  return THREAD_CLASS_SYSTEMS[systemId]?.defaultClassId ?? 'basic'
}

export function isThreadClassId(systemId, classId) {
  return Boolean(
    THREAD_CLASS_SYSTEMS[systemId]?.classes.some((threadClass) => threadClass.id === classId),
  )
}

export function threadClassShort(systemId, classId) {
  const classes = THREAD_CLASS_SYSTEMS[systemId]?.classes ?? [BASIC_CLASS]
  return classes.find((threadClass) => threadClass.id === classId)?.short ?? 'Basic'
}

// ASME B1.1 tabulates to four decimal places of an inch and derives its limits from each
// other in that rounded form, so every intermediate step rounds too. ISO 965 does the same
// at three decimal places of a millimetre.
function round4(value) {
  return Math.round(value * 1e4) / 1e4
}

function round3(value) {
  return Math.round(value * 1e3) / 1e3
}

// ASME B1.1 Appendix B, Class 2A pitch diameter tolerance. The tabulated classes use a
// length of engagement of the lesser of the basic major diameter and nine pitches.
export function class2AToleranceInch(majorDiameterInch, pitchInch) {
  const engagement = Math.min(majorDiameterInch, 9 * pitchInch)

  return (
    0.0015 * Math.cbrt(majorDiameterInch) +
    0.0015 * Math.sqrt(engagement) +
    0.015 * Math.cbrt(pitchInch * pitchInch)
  )
}

// Fallback for a thread the standard tables here do not cover. The formula reproduces most
// tabulated sizes but not all of them, so anything built this way is reported as computed
// and should be checked against the printed table before it is cut to.
export function computeUnifiedLimitsInch(majorDiameterInch, threadsPerInch) {
  const pitchInch = 1 / threadsPerInch
  const basic = round4(majorDiameterInch - 0.649519 * pitchInch)
  const tolerance2A = round4(class2AToleranceInch(majorDiameterInch, pitchInch))

  // Classes 1A and 2A carry a clearance allowance of 0.3 of the Class 2A tolerance, which
  // drops their maximum below the basic size. Class 3A has none, so it starts at basic.
  const allowance = round4(0.3 * tolerance2A)
  const tolerance3A = round4(0.75 * tolerance2A)
  const class2AMax = round4(basic - allowance)

  return {
    basic,
    class2AMax,
    class2AMin: round4(class2AMax - tolerance2A),
    class3AMin: round4(basic - tolerance3A),
  }
}

// A thread is identified by its geometry rather than its name, so 1-8 UNC and 8-UN-1 find
// the same row.
export function lookupUnifiedLimitsInch(majorDiameterInch, threadsPerInch) {
  const key = `${majorDiameterInch.toFixed(4)}-${Math.round(threadsPerInch)}`
  const tabulated = unifiedClassLimitsInch[key]

  if (tabulated) return { ...tabulated, source: 'table' }

  return {
    ...computeUnifiedLimitsInch(majorDiameterInch, Math.round(threadsPerInch)),
    source: 'formula',
  }
}

function unifiedLimitsMm(thread, classId) {
  if (classId !== '2A' && classId !== '3A') return null
  if (!(thread?.nominalDiameterMm > 0) || !(thread?.threadsPerInch > 0)) return null

  const limits = lookupUnifiedLimitsInch(
    thread.nominalDiameterMm / MM_PER_INCH,
    thread.threadsPerInch,
  )

  // Class 3A has no allowance, so its maximum is the basic pitch diameter itself.
  const maxInch = classId === '2A' ? limits.class2AMax : limits.basic
  const minInch = classId === '2A' ? limits.class2AMin : limits.class3AMin

  return {
    classId,
    source: limits.source,
    minMm: minInch * MM_PER_INCH,
    maxMm: maxInch * MM_PER_INCH,
  }
}

// The tables are keyed by exact pitches, and a pitch that has come through a unit
// conversion will not land on the key, so match by nearness instead.
const DEVIATION_PITCHES = Object.keys(isoFundamentalDeviationsUm).map(Number)
const samePitch = (a, b) => Math.abs(a - b) < 1e-6

export function isoDeviationUm(pitchMm, position) {
  const key = DEVIATION_PITCHES.find((pitch) => samePitch(pitch, pitchMm))
  if (key === undefined) return null

  return isoFundamentalDeviationsUm[key][position] ?? null
}

export function isoToleranceUm(nominalDiameterMm, pitchMm, grade) {
  const range = isoPitchDiameterTolerancesUm.find(
    (entry) => nominalDiameterMm > entry.overMm && nominalDiameterMm <= entry.upToMm,
  )

  return range?.pitches.find((entry) => samePitch(entry.pitch, pitchMm))?.grades[grade] ?? null
}

function isoLimitsMm(thread, classId) {
  const grade = Number(classId.slice(0, -1))
  const position = classId.slice(-1)
  const nominalDiameter = thread?.nominalDiameterMm
  const pitch = thread?.pitch
  if (!(nominalDiameter > 0) || !(pitch > 0) || !Number.isFinite(grade)) return null

  const deviation = isoDeviationUm(pitch, position)
  const tolerance = isoToleranceUm(nominalDiameter, pitch, grade)
  // ISO 965-1 starts at 0.99 mm and tabulates set pitches, so anything outside it -- a
  // sub-millimetre thread, say -- has no class rather than an invented one.
  if (deviation === null || tolerance === null) return null

  // Position h is zero deviation, so 4h opens at the basic pitch diameter; g sits below it.
  const maxMm = round3(round3(nominalDiameter - 0.649519 * pitch) + deviation / 1000)

  return {
    classId,
    source: 'table',
    minMm: round3(maxMm - tolerance / 1000),
    maxMm,
  }
}

/**
 * Pitch diameter limits in millimetres for an external thread at a class of fit. Returns
 * null for 'basic' and for any thread whose standard has no class system or whose size the
 * standard does not describe, which the caller reads as "no class limits to show".
 */
export function pitchDiameterLimitsMm(thread, standard, classId) {
  if (!classId || classId === 'basic') return null

  if (standard?.threadClassSystem === 'asme-b1.1') return unifiedLimitsMm(thread, classId)
  if (standard?.threadClassSystem === 'iso-965') return isoLimitsMm(thread, classId)

  return null
}
