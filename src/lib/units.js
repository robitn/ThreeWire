export const MM_PER_INCH = 25.4

// Everything is held in millimetres and converted at the edges, so a change of display unit
// never loses precision. The decimal counts land within a hair of each other: 0.0001 mm is
// 0.000004 in, and a wire measurement is not read finer than either.
const UNIT_SYSTEMS = {
  metric: { label: 'mm', decimals: 4 },
  imperial: { label: 'in', decimals: 5 },
}

export const UNIT_SYSTEM_IDS = Object.keys(UNIT_SYSTEMS)

export function isUnitSystem(value) {
  return Object.hasOwn(UNIT_SYSTEMS, value)
}

export function unitLabel(system) {
  return UNIT_SYSTEMS[system]?.label ?? ''
}

export function displayDecimals(system) {
  return UNIT_SYSTEMS[system]?.decimals ?? 4
}

export function toDisplay(valueMm, system) {
  return system === 'metric' ? valueMm : valueMm / MM_PER_INCH
}

export function toMillimeters(value, system) {
  return system === 'metric' ? value : value * MM_PER_INCH
}

export function roundTo(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Derived values are rounded for display, but a value the user typed is handed straight back
// so a rounding getter never rewrites the field mid-keystroke.
export function displayValue(typed, derived, decimals) {
  if (typed !== null && Math.abs(typed - derived) < 1e-9) return typed

  return roundTo(derived, decimals)
}
