import { describe, it, expect } from 'vitest'

import {
  MM_PER_INCH,
  displayValue,
  isUnitSystem,
  toDisplay,
  toMillimeters,
} from '../lib/units'

describe('unit conversion', () => {
  it('leaves metric alone and converts imperial', () => {
    expect(toDisplay(25.4, 'metric')).toBe(25.4)
    expect(toDisplay(25.4, 'imperial')).toBe(1)
    expect(toMillimeters(1, 'imperial')).toBe(MM_PER_INCH)
  })

  it('round-trips a value through either system', () => {
    for (const system of ['metric', 'imperial']) {
      expect(toMillimeters(toDisplay(12.7, system), system)).toBeCloseTo(12.7, 12)
    }
  })

  it('knows which system names are real', () => {
    expect(isUnitSystem('metric')).toBe(true)
    expect(isUnitSystem('furlongs')).toBe(false)
  })
})

// The subtle one. A number input is bound to a getter that rounds, so typing a digit past
// the rounding point would round the value and write it straight back into the field,
// eating the keystroke. A typed value that still agrees with the model is handed back
// untouched to stop that.
describe('displayValue', () => {
  it('rounds a derived value for display', () => {
    expect(displayValue(null, 0.217524, 5)).toBe(0.21752)
    expect(displayValue(null, 5.350481, 4)).toBe(5.3505)
  })

  it('hands back exactly what was typed while it still matches the model', () => {
    expect(displayValue(0.2175, 0.2175, 5)).toBe(0.2175)
    // Trailing precision the rounding would otherwise discard survives.
    expect(displayValue(0.2, 0.2, 5)).toBe(0.2)
  })

  it('drops the typed value once the model has moved on', () => {
    // A thread change or a unit switch moves the derived value; the field follows it.
    expect(displayValue(0.2175, 0.226804, 5)).toBe(0.2268)
  })
})
