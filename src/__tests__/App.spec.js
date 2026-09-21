import { beforeEach, describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

const STORAGE_KEY = 'twowire:settings:v1'
const GUIDE_KEY = 'twowire:guide-seen:v1'

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

async function useBasicClass(wrapper) {
  await wrapper.get('[data-testid="thread-class"]').setValue('basic')
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

function classOptions(wrapper) {
  return wrapper.findAll('[data-testid="thread-class"] option').map((option) => option.text())
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

  // Picking a thread is picking a size to work to, so the field starts at what that thread
  // should measure rather than at an arbitrary number. An inch thread has a class of fit,
  // and its maximum is the size to cut to.
  it('starts the measurement at the class maximum of the selected thread', () => {
    const wrapper = mountApp()

    // 1/4-20 UNC Class 2A maximum pitch diameter.
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('2A max')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.2164')
  })

  it('starts at the basic pitch diameter when no class is chosen', async () => {
    const wrapper = mountApp()

    await useBasicClass(wrapper)

    // 1/4-20 UNC: 0.25 in major, less 0.649519 * 0.05 in.
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Nominal')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.21752')
    expect(wrapper.get('[data-testid="result"]').text()).toContain('0.26083')
    expect(wrapper.find('[data-testid="result-range"]').exists()).toBe(false)
  })

  it('moves the nominal measurement to a newly selected thread', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useBasicClass(wrapper)
    await useMetric(wrapper)
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('5.3505')

    await wrapper.get('[data-testid="pitch"]').setValue('metric-m6x0-5-external')

    // Same nominal diameter, finer pitch: the pitch diameter moves with it.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('5.6752')
  })

  it('pins the measurement once one is entered and can return to nominal', async () => {
    const wrapper = mountApp()

    await useBasicClass(wrapper)
    await useMetric(wrapper)
    await wrapper.get('[data-testid="target-measurement"]').setValue('5.5')

    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Measured')
    expect(wrapper.get('[data-testid="nominal-target"]').text()).toBe('Nominal 5.5251 mm')

    await wrapper.get('[data-testid="use-target-measurement"]').trigger('click')

    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Nominal')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('5.5251')
    expect(wrapper.find('[data-testid="nominal-target"]').exists()).toBe(false)
  })

  // Unlike the wire size, a reading only means anything on the thread it was taken from.
  it('drops a measurement that belongs to the previous thread', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-testid="target-measurement"]').setValue('0.216')
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Measured')

    await selectThread(wrapper, 'unf', '1/4')

    // 1/4-28 UNF Class 2A maximum.
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('2A max')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.2258')
  })

  // Changing class re-aims the target, but a reading already taken is still a reading of
  // that same thread, so it stays and simply gets judged against the new limits.
  it('keeps a measurement across a change of class', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-testid="target-measurement"]').setValue('0.216')
    await wrapper.get('[data-testid="thread-class"]').setValue('3A')

    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Measured')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.216')
  })

  it('keeps a nominal measurement nominal across a mode switch', async () => {
    const wrapper = mountApp()

    await useBasicClass(wrapper)
    await wrapper.get('[data-testid="mode-find-e"]').trigger('click')

    // The field now means M, so it holds what a perfect 1/4-20 reads over best-size wires,
    // and solving it returns the pitch diameter it was built from.
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Nominal')
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.26083')
    expect(wrapper.get('[data-testid="result"]').text()).toContain('0.21752')
  })

  // The 60 deg coefficients 3W and 0.86603P are a coincidence of that angle and do not
  // carry over to Whitworth's 55 deg form.
  it('uses the thread angle of a 55 degree BSP thread in the three-wire formula', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'bsp', 'G1/2')
    await useMetric(wrapper)

    // ISO 228-1 G1/2: 20.955 mm major, 19.793 mm pitch diameter.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('19.7934')
    expect(wrapper.get('[data-testid="best-wire-size"]').text()).toBe('1.0225 mm')
    // E + 3.16568 W - 0.96049 P. The 60 deg constants would give 21.2700 mm.
    expect(wrapper.get('[data-testid="result"]').text()).toContain('21.2881')
  })

  // Each standard offers the classes of its own system, and BSP offers none because the
  // calculator does not implement one for it.
  it('offers the class system that belongs to the selected standard', async () => {
    const wrapper = mountApp()

    expect(classOptions(wrapper)).toEqual(['Basic', 'Class 2A', 'Class 3A'])

    await selectThread(wrapper, 'metric', 'M6')
    expect(classOptions(wrapper)).toEqual(['Basic', '6g (general purpose)', '4h (close)'])

    await selectThread(wrapper, 'bsp', 'G1/2')
    expect(wrapper.find('[data-testid="thread-class"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="result-range"]').exists()).toBe(false)

    await selectThread(wrapper, 'unc', '5/8')
    expect(classOptions(wrapper)).toEqual(['Basic', 'Class 2A', 'Class 3A'])
  })

  // The two systems have nothing to say to each other, so each remembers its own choice
  // instead of one resetting the other.
  it('keeps a class per standard when moving between them', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-testid="thread-class"]').setValue('3A')

    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.get('[data-testid="thread-class"]').element.value).toBe('6g')
    await wrapper.get('[data-testid="thread-class"]').setValue('4h')

    await selectThread(wrapper, 'unc', '1/4')
    expect(wrapper.get('[data-testid="thread-class"]').element.value).toBe('3A')

    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.get('[data-testid="thread-class"]').element.value).toBe('4h')
  })

  it('works to the ISO 965 6g limits for M6 x 1', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useMetric(wrapper)

    // ISO 965-1: basic 5.350, es(g) -26 um at P = 1, Td2 grade 6 112 um.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('5.324')
    expect(wrapper.get('[data-testid="field-range"]').text()).toBe('6g 5.2120 to 5.3240 mm')
    expect(wrapper.get('[data-testid="class-verdict"]').text()).toBe('Within 6g')
  })

  it('works to the ISO 965 4h limits for M6 x 1', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M6')
    await useMetric(wrapper)
    await wrapper.get('[data-testid="thread-class"]').setValue('4h')

    // Position h has no allowance, so 4h opens at the basic 5.350; grade 4 is 71 um.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('5.35')
    expect(wrapper.get('[data-testid="field-range"]').text()).toBe('4h 5.2790 to 5.3500 mm')
  })

  // ISO 965-1 starts at 0.99 mm and tabulates set diameter and pitch combinations, so part
  // of the catalog falls outside it. Those say so rather than quietly showing a basic size
  // while the class selector claims 6g.
  it('says so when ISO 965 does not tabulate the selected thread', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'metric', 'M0.25')

    expect(wrapper.find('[data-testid="result-range"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="target-measurement-mode"]').text()).toBe('Nominal')
    expect(wrapper.get('[data-testid="class-unavailable"]').text()).toContain('ISO 965')

    await selectThread(wrapper, 'metric', 'M6')
    expect(wrapper.find('[data-testid="class-unavailable"]').exists()).toBe(false)
  })

  it('works to the published Class 2A limits for 5/8-11 UNC', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'unc', '5/8')

    // ASME B1.1: basic 0.5660, Class 2A 0.5589 to 0.5644 after its clearance allowance.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.5644')
    expect(wrapper.get('[data-testid="field-range"]').text()).toBe('2A 0.55890 to 0.56440 in')
    // The same limits carried through the wires: M = E + 3W - (P/2) cot 30.
    expect(wrapper.get('[data-testid="result-range"]').text()).toBe('2A 0.63763 to 0.64313 in')
    expect(wrapper.get('[data-testid="class-verdict"]').text()).toBe('Within 2A')
  })

  it('works to the published Class 3A limits for 5/8-11 UNC', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'unc', '5/8')
    await wrapper.get('[data-testid="thread-class"]').setValue('3A')

    // Class 3A has no allowance, so it runs from 0.5619 up to the basic 0.5660.
    expect(wrapper.get('[data-testid="target-measurement"]').element.value).toBe('0.566')
    expect(wrapper.get('[data-testid="field-range"]').text()).toBe('3A 0.56190 to 0.56600 in')
    expect(wrapper.get('[data-testid="result-range"]').text()).toBe('3A 0.64063 to 0.64473 in')
  })

  // The pitch diameter limits are fixed by the class, but what the micrometer should read
  // depends on the wires actually in use.
  it('builds the over-wires range from the wire size in use', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'unc', '5/8')
    await wrapper.get('[data-testid="wire-size"]').setValue('0.0400')

    expect(wrapper.get('[data-testid="field-range"]').text()).toBe('2A 0.55890 to 0.56440 in')
    expect(wrapper.get('[data-testid="result-range"]').text()).toBe('2A 0.60017 to 0.60567 in')
  })

  it('says whether a measurement over wires lands inside the class', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'unc', '5/8')
    await wrapper.get('[data-testid="mode-find-e"]').trigger('click')

    await wrapper.get('[data-testid="target-measurement"]').setValue('0.6400')
    expect(wrapper.get('[data-testid="class-verdict"]').text()).toBe('Within 2A')

    await wrapper.get('[data-testid="target-measurement"]').setValue('0.6300')
    expect(wrapper.get('[data-testid="class-verdict"]').text()).toBe('Under 2A min')

    await wrapper.get('[data-testid="target-measurement"]').setValue('0.6500')
    expect(wrapper.get('[data-testid="class-verdict"]').text()).toBe('Over 2A max')
  })

  // The Appendix B formula does not reproduce every tabulated size, so a computed limit has
  // to say so rather than pass itself off as the published one.
  it('flags class limits that came from the formula rather than the table', async () => {
    const wrapper = mountApp()

    await selectThread(wrapper, 'unc', '5/8')
    expect(wrapper.find('[data-testid="class-source"]').exists()).toBe(false)

    await selectThread(wrapper, '8-un', '2')
    expect(wrapper.find('[data-testid="class-source"]').exists()).toBe(true)
  })

  it('restores the class of fit after a reload', async () => {
    const first = mountApp()

    await first.get('[data-testid="thread-class"]').setValue('3A')
    first.unmount()

    const second = mountApp()

    expect(second.get('[data-testid="thread-class"]').element.value).toBe('3A')
  })

  // The point of showing this is telling whether an installed copy has picked up a deploy,
  // which the version alone cannot do: a fix need not bump it. The commit always changes.
  it('shows the version and the commit it was built from', () => {
    const wrapper = mountApp()
    const stamp = wrapper.get('[data-testid="build-version"]').text()

    expect(stamp).toMatch(/^v\d+\.\d+\.\d+ \u00b7 \S+$/)
    expect(stamp).toContain(`v${__APP_VERSION__}`)
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
        classId: '9Z',
      }),
    )

    const wrapper = mountApp()

    expect(wrapper.get('[data-testid="mode-find-m"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="units-imperial"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="thread-standard"]').element.value).toBe('unc')
    expect(wrapper.get('[data-testid="fastener-size"]').element.value).toBe('1/4')
    expect(wrapper.get('[data-testid="wire-size-mode"]').text()).toBe('Auto')
    expect(wrapper.get('[data-testid="thread-class"]').element.value).toBe('2A')
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

// The guide opens itself once and then gets out of the way. A returning user who is here to
// measure a thread should never meet it again unless they ask for it.
describe('App guide', () => {
  function guideIsOpen(wrapper) {
    return wrapper.find('[data-testid="guide-sheet"]').exists()
  }

  it('opens the guide on a first run', () => {
    expect(guideIsOpen(mountApp())).toBe(true)
  })

  it('leaves the guide closed for someone who has seen it', () => {
    window.localStorage.setItem(GUIDE_KEY, new Date().toISOString())

    expect(guideIsOpen(mountApp())).toBe(false)
  })

  it('remembers the guide was closed, across a relaunch', async () => {
    const wrapper = mountApp()
    await wrapper.get('[data-testid="guide-sheet-close"]').trigger('click')

    expect(guideIsOpen(wrapper)).toBe(false)
    expect(window.localStorage.getItem(GUIDE_KEY)).not.toBeNull()
    expect(guideIsOpen(mountApp())).toBe(false)
  })

  it('reopens the guide from the header button', async () => {
    window.localStorage.setItem(GUIDE_KEY, new Date().toISOString())
    const wrapper = mountApp()

    await wrapper.get('[data-testid="open-guide"]').trigger('click')

    expect(guideIsOpen(wrapper)).toBe(true)
  })

  // Storage refusing to hold the flag would otherwise mean the manual on every launch.
  it('does not open the guide when storage is unavailable', () => {
    setStorage(undefined)

    expect(guideIsOpen(mountApp())).toBe(false)
  })
})
