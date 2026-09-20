import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import ReloadPrompt from '../components/ReloadPrompt.vue'

// The virtual module only exists inside the vite-plugin-pwa build, and it is the thing
// under test here anyway: the component's job is to render its state and call back into it.
vi.mock('virtual:pwa-register/vue', async () => {
  const { ref } = await import('vue')
  const needRefresh = ref(false)
  const updateServiceWorker = vi.fn()

  return {
    useRegisterSW: () => ({ needRefresh, updateServiceWorker }),
    __mock: { needRefresh, updateServiceWorker },
  }
})

const { __mock } = await import('virtual:pwa-register/vue')

function setServiceWorker(value) {
  Object.defineProperty(navigator, 'serviceWorker', { value, configurable: true })
}

beforeEach(() => {
  __mock.needRefresh.value = false
  __mock.updateServiceWorker.mockClear()
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('ReloadPrompt', () => {
  it('stays out of the way until a new version is waiting', async () => {
    const wrapper = mount(ReloadPrompt)

    expect(wrapper.find('[data-testid="reload-prompt"]').exists()).toBe(false)

    __mock.needRefresh.value = true
    await flushPromises()

    expect(wrapper.get('[data-testid="reload-prompt"]').text()).toContain(
      'A new version is ready',
    )
  })

  // Passing true is what makes the waiting worker skip waiting and the page reload onto the
  // new assets; without it the worker takes over only on the next visit.
  it('hands over to the waiting worker and reloads when Update is clicked', async () => {
    const wrapper = mount(ReloadPrompt)
    __mock.needRefresh.value = true
    await flushPromises()

    await wrapper.get('[data-testid="reload-prompt-update"]').trigger('click')

    expect(__mock.updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('dismisses without updating when Close is clicked', async () => {
    const wrapper = mount(ReloadPrompt)
    __mock.needRefresh.value = true
    await flushPromises()

    await wrapper.get('[data-testid="reload-prompt-close"]').trigger('click')

    expect(wrapper.find('[data-testid="reload-prompt"]').exists()).toBe(false)
    expect(__mock.updateServiceWorker).not.toHaveBeenCalled()
  })

  // A worker from an earlier visit is already in charge and raises no registration event,
  // so without this check the prompt would wait on the browser's own schedule.
  it('asks the existing registration for an update on launch', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    setServiceWorker({ getRegistration: vi.fn().mockResolvedValue({ update }) })

    mount(ReloadPrompt)
    await flushPromises()

    expect(update).toHaveBeenCalledOnce()
  })

  it('does nothing on launch when there is no registration yet', async () => {
    setServiceWorker({ getRegistration: vi.fn().mockResolvedValue(undefined) })

    mount(ReloadPrompt)
    await flushPromises()

    expect(__mock.updateServiceWorker).not.toHaveBeenCalled()
  })

  // An update check is best effort. A browser without service workers, or one that refuses
  // the check because it is offline, must not take the calculator down with it.
  it('survives a browser with no service worker support', async () => {
    expect('serviceWorker' in navigator).toBe(false)

    const wrapper = mount(ReloadPrompt)
    await flushPromises()

    expect(wrapper.find('[data-testid="reload-prompt"]').exists()).toBe(false)
  })

  it('survives a failed update check', async () => {
    setServiceWorker({ getRegistration: vi.fn().mockRejectedValue(new Error('offline')) })

    const wrapper = mount(ReloadPrompt)
    await flushPromises()

    expect(wrapper.find('[data-testid="reload-prompt"]').exists()).toBe(false)
  })
})
