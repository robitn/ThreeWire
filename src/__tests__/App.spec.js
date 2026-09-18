import { beforeEach, describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

const STORAGE_KEY = 'twowire:settings:v1'

// First-run state: Find measure over wires, imperial units, 1/4-20 UNC (1.27 mm pitch, 60 deg).
function mountApp() {
  return mount(App)
}

function createMemoryStorage() {
  const entries = new Map()
  return {
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
    clear: () => entries.clear(),
  }
}

function setStorage(value) {
  Object.defineProperty(window, 'localStorage', { value, configurable: true, writable: true })
}

async function useMetric(wrapper) {
  await wrapper.get('[data-testid="units-metric"]').trigger('click')
}

// Standard and size narrow the pitch list down; the pitch option carries the thread id.
async function selectThread(wrapper, standardId, size, threadId) {
  await wrapper.get('[data-testid="thread-standard"]').setValue(standardId)
  await wrapper.get('[data-testid="fastener-size"]').setValue(size)
  if (threadId) await wrapper.get('[data-testid="pitch"]').setValue(threadId)
}

function pitchOptions(wrapper) {
  return wrapper.findAll('[data-testid="pitch"] option').map((option) => option.text())
}

function pitchLabel(wrapper) {
  return wrapper.get('label[for="pitch"]').text()
}

function selectedPitch(wrapper) {
  const select = wrapper.get('[data-testid="pitch"]')
  return select
    .findAll('option')
    .find((option) => option.element.value === select.element.value)
    .text()
}

beforeEach(() => {
  setStorage(createMemoryStorage())
})

describe('App', () => {
  it('renders the Thread Wire Calculator', () => {
    const wrapper = mountApp()

    expect(wrapper.text()).toContain('Thread Wire Calculator')
    expect(wrapper.text()).toContain('Find pitch diameter')
    expect(wrapper.text()).toContain('Find measure over wires')
    expect(wrapper.text()).toContain('Best wire size')
  })

  it('opens in measure-over-wires mode with imperial units', () => {
    const wrapper = mountApp()

    expect(wrapper.get('[data-testid="mode-find-m"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="units-imperial"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="thread-standard"]').element.value).toBe('unc')
    expect(wrapper.get('[data-testid="fastener-size"]').element.value).toBe('1/4')
    expect(wrapper.get('[data-testid="pitch"]').element.value).toBe('unc-unc-1-4-external')
  })

  it('offers only the pitches the selected standard and size have', async () => {
    const wrapper = mountApp()

    // A UNC size is a single pitch; a metric size usually is not.
    expect(pitchOptions(wrapper)).toEqual(['20'])

    await selectThread(wrapper, 'metric', 'M6')

    expect(pitchOptions(wrapper)).toEqual(['1', '0.8', '0.75', '0.7', '0.5'])
  })

  // How a pitch is quoted belongs to the standard: metric ISO is a peak-to-peak distance
  // in millimetres, an inch series is threads per inch. The display units do not change it.
  it('quotes metric standards in millimetres in either display unit', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    expect(pitchLabel(wrapper)).toBe('Pitch (mm)')
    expect(pitchOptions(wrapper)).toEqual(['1', '0.8', '0.75', '0.7', '0.5'])

    await useMetric(wrapper)
    expect(pitchLabel(wrapper)).toBe('Pitch (mm)')
    expect(pitchOptions(wrapper)).toEqual(['1', '0.8', '0.75', '0.7', '0.5'])
  })

  it('quotes inch-series standards as TPI in either display unit', async () => {
    const wrapper = mountApp()

    expect(pitchLabel(wrapper)).toBe('Pitch (TPI)')
    expect(selectedPitch(wrapper)).toBe('20')

    await useMetric(wrapper)

    expect(pitchLabel(wrapper)).toBe('Pitch (TPI)')
    expect(selectedPitch(wrapper)).toBe('20')
  })

  it('reads the pitch back as a length unless the option already is one', async () => {
    const wrapper = mountApp()

    // Inch series: TPI options, so the length is worth stating in either display unit.
    expect(wrapper.get('[data-testid="pitch-length"]').text()).toBe('= 0.05000 in pitch')
    await useMetric(wrapper)
    expect(wrapper.get('[data-testid="pitch-length"]').text()).toBe('= 1.2700 mm pitch')

    // Metric standard in metric units: the option is the millimetre pitch already.
    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.find('[data-testid="pitch-length"]').exists()).toBe(false)

    await wrapper.get('[data-testid="units-imperial"]').trigger('click')
    expect(wrapper.get('[data-testid="pitch-length"]').text()).toBe('= 0.03937 in pitch')
  })

  it('drives the calculation from the chosen pitch', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useMetric(wrapper)
    expect(wrapper.get('[data-testid="best-wire-size"]').text()).toBe('0.5774 mm')

    await wrapper.get('[data-testid="pitch"]').setValue('metric-m6x0-8-external')

    expect(selectedPitch(wrapper)).toBe('0.8')
    expect(wrapper.get('[data-testid="best-wire-size"]').text()).toBe('0.4619 mm')
  })

  it('holds the pitch when the new size offers it', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useMetric(wrapper)
    expect(selectedPitch(wrapper)).toBe('1')

    await wrapper.get('[data-testid="fastener-size"]').setValue('M8')

    expect(selectedPitch(wrapper)).toBe('1')
    expect(wrapper.get('[data-testid="pitch"]').element.value).toBe('metric-m8x1-external')
  })

  it('falls back to the coarsest pitch when the new size lacks the current one', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useMetric(wrapper)
    await wrapper.get('[data-testid="fastener-size"]').setValue('M0.25')

    expect(pitchOptions(wrapper)).toEqual(['0.075'])
    expect(selectedPitch(wrapper)).toBe('0.075')
  })

  it('moves to the first size and pitch of a newly chosen standard', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-testid="thread-standard"]').setValue('metric')

    expect(wrapper.get('[data-testid="fastener-size"]').element.value).toBe('M0.25')
    expect(wrapper.get('[data-testid="pitch"]').element.value).toBe('metric-m0-25x0-075-external')
  })

  it('carries the calculated value across a mode switch', async () => {
    const wrapper = mountApp()

    await useMetric(wrapper)
    await wrapper.get('[data-testid="mode-find-e"]').trigger('click')
    await wrapper.get('[data-testid="target-measurement"]').setValue('12.7')
    expect(wrapper.get('[data-testid="result"]').text()).toContain('11.6001')

    await wrapper.get('[data-testid="mode-find-m"]').trigger('click')

    // The input holds the rounded carry; the stored value keeps full precision, so the
    // result below comes back to exactly the measurement entered above.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('11.6001')
    expect(wrapper.get('[data-testid="result"]').text()).toContain('12.7000')
  })

  it('follows the best wire size until the wire size is overridden', async () => {
    const wrapper = mountApp()

    await useMetric(wrapper)
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Auto')
    expect(wrapper.get('[data-testid="wire-size"]').element.value).toBe('0.7332')

    // In auto mode the wire size tracks the selected thread.
    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.get('[data-testid="wire-size"]').element.value).toBe('0.5774')
    expect(wrapper.find('[data-testid="use-best-wire"]').exists()).toBe(false)
  })

  it('keeps an overridden wire size across thread changes and can reset it', async () => {
    const wrapper = mountApp()

    await useMetric(wrapper)
    await wrapper.get('[data-testid="wire-size"]').setValue('0.7')
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Custom')

    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.get('[data-testid="wire-size"]').element.value).toBe('0.7')
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Custom')
    expect(wrapper.text()).toContain('Best 0.5774 mm')

    await wrapper.get('[data-testid="use-best-wire"]').trigger('click')
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Auto')
    expect(wrapper.get('[data-testid="wire-size"]').element.value).toBe('0.5774')
  })

  it('restores mode, units, thread selection and wire size after a reload', async () => {
    const first = mountApp()

    await useMetric(first)
    await first.get('[data-testid="mode-find-e"]').trigger('click')
    await selectThread(first, 'metric', 'M6', 'metric-m6x0-8-external')
    await first.get('[data-testid="wire-size"]').setValue('0.7')
    first.unmount()

    const second = mountApp()

    expect(second.get('[data-testid="units-metric"]').attributes('aria-pressed')).toBe('true')
    expect(second.get('[data-testid="mode-find-e"]').attributes('aria-pressed')).toBe('true')
    expect(second.get('[data-testid="thread-standard"]').element.value).toBe('metric')
    expect(second.get('[data-testid="fastener-size"]').element.value).toBe('M6')
    expect(second.get('[data-testid="pitch"]').element.value).toBe('metric-m6x0-8-external')
    expect(selectedPitch(second)).toBe('0.8')
    expect(second.get('[data-testid="wire-size"]').element.value).toBe('0.7')
    expect(second.get('[data-testid="wire-size-mode"]').text()).toBe('Custom')
  })

  it('restores an auto wire size as auto', async () => {
    const first = mountApp()

    await first.get('[data-testid="wire-size"]').setValue('0.03')
    await first.get('[data-testid="use-best-wire"]').trigger('click')
    first.unmount()

    const second = mountApp()

    expect(second.get('[data-testid="wire-size-mode"]').text()).toBe('Auto')
    expect(second.find('[data-testid="use-best-wire"]').exists()).toBe(false)
  })

  it('falls back to the defaults when stored settings are unusable', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode: 'findX',
        unitSystem: 'furlongs',
        standardId: 'no-such-standard',
        threadId: 'no-such-thread',
        wireSizeMm: -3,
      }),
    )

    const wrapper = mountApp()

    expect(wrapper.get('[data-testid="mode-find-m"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="units-imperial"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="thread-standard"]').element.value).toBe('unc')
    expect(wrapper.get('[data-testid="fastener-size"]').element.value).toBe('1/4')
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Auto')
  })

  it('falls back to a valid thread when only the stored fastener is unknown', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ standardId: 'metric', threadId: 'unc-unc-1-4-external' }),
    )

    const wrapper = mountApp()

    // The standard is kept; the mismatched fastener becomes the first size of that standard.
    expect(wrapper.get('[data-testid="thread-standard"]').element.value).toBe('metric')
    expect(wrapper.get('[data-testid="fastener-size"]').element.value).toBe('M0.25')
  })

  it('survives a corrupt storage entry', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')

    const wrapper = mountApp()

    expect(wrapper.get('[data-testid="units-imperial"]').attributes('aria-pressed')).toBe('true')
  })

  it('works when storage is unavailable', async () => {
    setStorage(undefined)

    const wrapper = mountApp()
    await useMetric(wrapper)

    expect(wrapper.get('[data-testid="units-metric"]').attributes('aria-pressed')).toBe('true')
  })
})
