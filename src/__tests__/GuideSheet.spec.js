import { afterEach, describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import GuideSheet from '../components/GuideSheet.vue'
import { guideSections } from '../data/userGuide'

// attachTo is needed throughout: focus, document level key handling and the scroll lock all
// read state that only exists once the component is in the real document.
function mountSheet(open = true) {
  return mount(GuideSheet, { props: { open }, attachTo: document.body })
}

function pressKey(key, init = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

afterEach(() => {
  document.body.style.overflow = ''
})

describe('GuideSheet', () => {
  it('renders nothing until it is opened', () => {
    const wrapper = mountSheet(false)

    expect(wrapper.find('[data-testid="guide-sheet"]').exists()).toBe(false)
  })

  it('renders the guide in a modal dialog', () => {
    const wrapper = mountSheet()
    const dialog = wrapper.get('[data-testid="guide-sheet"]')

    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.attributes('aria-labelledby')).toBe('guide-sheet-title')
    expect(wrapper.get('#guide-sheet-title').text()).toContain('User Guide')
    expect(wrapper.html()).toContain('the three-wire method')
  })

  it('offers a jump for every section', () => {
    const wrapper = mountSheet()

    expect(wrapper.findAll('[data-testid="guide-sheet-jump"]')).toHaveLength(guideSections.length)
  })

  it('scrolls the body to the heading a jump names', async () => {
    const wrapper = mountSheet()
    const [section] = guideSections
    const body = wrapper.get('.guide-sheet__body').element
    const heading = body.querySelector(`[id="${section.id}"]`)

    // jsdom lays nothing out, so the heading needs an offset for the scroll to aim at.
    Object.defineProperty(heading, 'offsetTop', { value: 420, configurable: true })
    await wrapper.get('[data-testid="guide-sheet-jump"]').trigger('click')

    expect(body.scrollTop).toBe(420)
  })

  it('closes on the button, the backdrop and Escape', async () => {
    const wrapper = mountSheet()

    await wrapper.get('[data-testid="guide-sheet-close"]').trigger('click')
    await wrapper.get('.guide-sheet__backdrop').trigger('click')
    pressKey('Escape')

    expect(wrapper.emitted('close')).toHaveLength(3)
  })

  it('takes focus on open and hands it back on close', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const wrapper = mountSheet(false)
    await wrapper.setProps({ open: true })
    // The sheet waits a tick before focusing, so the panel exists to take the focus.
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('[data-testid="guide-sheet-close"]').element)

    await wrapper.setProps({ open: false })

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('keeps Tab inside the sheet', async () => {
    const wrapper = mountSheet()
    const focusable = [...wrapper.get('[data-testid="guide-sheet"]').element.querySelectorAll('button')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    last.focus()
    pressKey('Tab')
    expect(document.activeElement).toBe(first)

    pressKey('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  // The sheet scrolls its own body; the calculator behind it must not scroll with it.
  it('locks the page behind it while it is open', async () => {
    const wrapper = mountSheet(false)
    expect(document.body.style.overflow).toBe('')

    await wrapper.setProps({ open: true })
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.setProps({ open: false })
    expect(document.body.style.overflow).toBe('')
  })

  it('releases the page when it is unmounted while open', () => {
    const wrapper = mountSheet()
    expect(document.body.style.overflow).toBe('hidden')

    wrapper.unmount()

    expect(document.body.style.overflow).toBe('')
  })
})
