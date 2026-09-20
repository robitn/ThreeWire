// Pure thread geometry, in millimetres and degrees. Nothing here knows about Vue, display
// units or the catalog: every function takes the thread it is working on.

const DEGREES_TO_RADIANS = Math.PI / 180

// 'M6 x 1' and 'M0.25 x 0.075' both reduce to their nominal size; imperial designations
// ('1/4', '#1', 'G1/2') carry no pitch and pass through untouched.
export function sizeOf(thread) {
  return thread.designation.replace(/\s*x\s*[\d.]+$/, '')
}

export function halfAngleRadians(thread) {
  return (thread.angle / 2) * DEGREES_TO_RADIANS
}

// The best-size wire touches each flank exactly at the pitch line, where flank contact is
// insensitive to how far the wire sinks into the groove.
export function bestWireDiameterMm(thread) {
  return thread.pitch / (2 * Math.cos(halfAngleRadians(thread)))
}

// The basic pitch diameter: the theoretical size, before any class of fit narrows it. The
// thread catalog carries no tolerance data, so this is all geometry, and it is what a thread
// without an applicable class has to be measured against.
export function basicPitchDiameterMm(thread, standard) {
  const nominalDiameter = thread?.nominalDiameterMm
  const factor = standard?.pitchDiameterFactor
  if (!nominalDiameter || !factor) return null

  return nominalDiameter - factor * thread.pitch
}

// Three-wire geometry: a wire of diameter W in the groove stands W * (1 + 1/sin(half angle))
// proud of the flank contact, and the sharp-V apex of the groove sits (P/2) * cot(half angle)
// below the pitch line. Both coefficients follow the thread angle. At 60 deg they collapse to
// the familiar 3W - 0.86603P, but a 55 deg Whitworth form needs 3.16568W - 0.96049P, so
// neither can be hardcoded while the catalog carries BSP.
export function wireContributionMm(thread, wireDiameterMm) {
  return wireDiameterMm * (1 + 1 / Math.sin(halfAngleRadians(thread)))
}

export function pitchContributionMm(thread) {
  return thread.pitch / (2 * Math.tan(halfAngleRadians(thread)))
}

export function measurementOverWiresMm(pitchDiameterMm, thread, wireDiameterMm) {
  return pitchDiameterMm + wireContributionMm(thread, wireDiameterMm) - pitchContributionMm(thread)
}

export function pitchDiameterOverWiresMm(measurementMm, thread, wireDiameterMm) {
  return measurementMm - wireContributionMm(thread, wireDiameterMm) + pitchContributionMm(thread)
}
