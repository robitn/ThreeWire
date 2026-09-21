<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'

import { guideHtml, guideSections, guideTitle } from '../data/userGuide'

// The body is rendered with v-html. The HTML is generated at build time from user.md by
// scripts/convert-guide.mjs, which escapes every character it did not put there itself, so
// there is no user input anywhere in it.

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

const panel = ref(null)
const body = ref(null)
const closeButton = ref(null)

// Where focus was when the sheet opened, so closing it puts the caller back where it was.
let lastFocused = null

function close() {
  emit('close')
}

// Listening on the document rather than the panel: clicking a paragraph inside the sheet
// moves focus to the body element, and a handler bound to the panel would stop hearing
// Escape the moment that happened.
function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key !== 'Tab' || !panel.value) return

  const targets = [...panel.value.querySelectorAll(FOCUSABLE)]
  if (!targets.length) return

  const first = targets[0]
  const last = targets[targets.length - 1]
  const active = document.activeElement
  const outside = !panel.value.contains(active)

  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault()
    first.focus()
  }
}

// Scrolling the container rather than calling scrollIntoView, which would scroll the page
// behind the sheet as well. The ids are slugs, so the attribute selector needs no escaping.
function jumpTo(id) {
  const heading = body.value?.querySelector(`[id="${id}"]`)
  if (heading && body.value) body.value.scrollTop = heading.offsetTop
}

function releaseScroll() {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown)

      await nextTick()
      closeButton.value?.focus()
      return
    }

    releaseScroll()
    lastFocused?.focus?.()
    lastFocused = null
  },
  { immediate: true },
)

onUnmounted(releaseScroll)
</script>

<template>
  <Transition name="guide-sheet">
    <div v-if="open" class="guide-sheet">
      <div class="guide-sheet__backdrop" @click="close"></div>

      <div
        ref="panel"
        class="guide-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-sheet-title"
        data-testid="guide-sheet"
      >
        <header class="guide-sheet__header">
          <h2 id="guide-sheet-title" class="guide-sheet__title">{{ guideTitle }}</h2>
          <button
            ref="closeButton"
            class="guide-sheet__close"
            type="button"
            data-testid="guide-sheet-close"
            @click="close"
          >
            Close
          </button>
        </header>

        <div ref="body" class="guide-sheet__body">
          <nav class="guide-sheet__contents" aria-label="Guide contents">
            <p class="guide-sheet__contents-title">Contents</p>
            <ul>
              <li v-for="section in guideSections" :key="section.id">
                <button
                  class="guide-sheet__jump"
                  type="button"
                  data-testid="guide-sheet-jump"
                  @click="jumpTo(section.id)"
                >
                  {{ section.title }}
                </button>
              </li>
            </ul>
          </nav>

          <div class="guide-sheet__prose" v-html="guideHtml"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.guide-sheet {
  /* Above the update toast, which sits at 100: the sheet is modal and the toast is not. */
  position: fixed;
  z-index: 200;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

@media (min-width: 640px) {
  .guide-sheet {
    align-items: center;
    padding: 2rem 1rem;
  }
}

.guide-sheet__backdrop {
  position: absolute;
  inset: 0;
  background-color: rgb(2 6 23 / 0.55);
}

.guide-sheet__panel {
  position: relative;
  display: flex;
  flex-direction: column;

  /* Full height on a phone, a card on anything wider. */
  width: 100%;
  max-width: 44rem;
  height: 100%;
  max-height: 100%;
  border-radius: 0;
  background-color: #ffffff;
  box-shadow:
    0 10px 15px -3px rgb(2 6 23 / 0.15),
    0 4px 6px -4px rgb(2 6 23 / 0.1);
}

@media (min-width: 640px) {
  .guide-sheet__panel {
    height: auto;
    max-height: 100%;
    border-radius: 1.5rem;
  }
}

.guide-sheet__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid #e2e8f0;
}

@media (min-width: 640px) {
  .guide-sheet__header {
    padding: 1.25rem 1.75rem;
  }
}

.guide-sheet__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #020617;
}

.guide-sheet__close {
  flex: none;
  border: none;
  border-radius: 0.625rem;
  padding: 0.5rem 0.875rem;
  background-color: #f1f5f9;
  color: #0f172a;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.guide-sheet__close:hover {
  background-color: #e2e8f0;
}

.guide-sheet__close:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.guide-sheet__body {
  position: relative; /* offsetTop of a heading is measured against this, for jumpTo(). */
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 1.25rem;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 640px) {
  .guide-sheet__body {
    padding: 1.75rem;
  }
}

.guide-sheet__contents {
  margin-bottom: 1.75rem;
  border-radius: 1rem;
  background-color: #f8fafc;
  outline: 1px solid #e2e8f0;
  outline-offset: -1px;
  padding: 1rem 1.125rem;
}

.guide-sheet__contents-title {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.guide-sheet__contents ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.125rem;
}

@media (min-width: 640px) {
  .guide-sheet__contents ul {
    grid-template-columns: 1fr 1fr;
    gap: 0.125rem 1.5rem;
  }
}

.guide-sheet__jump {
  border: none;
  background: none;
  padding: 0.25rem 0;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1d4ed8;
  text-align: left;
  cursor: pointer;
}

.guide-sheet__jump:hover {
  color: #1e40af;
}

.guide-sheet__jump:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-radius: 0.25rem;
}

/* The prose below is generated markup, so it is styled by element rather than by class. */
.guide-sheet__prose {
  color: #334155;
  font-size: 0.9375rem;
  line-height: 1.65;
}

.guide-sheet__prose :deep(h2) {
  margin: 2rem 0 0.75rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: #020617;
  scroll-margin-top: 1rem;
}

.guide-sheet__prose :deep(h2:first-child) {
  margin-top: 0;
}

.guide-sheet__prose :deep(h3) {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.guide-sheet__prose :deep(p) {
  margin: 0 0 0.875rem;
}

.guide-sheet__prose :deep(ul),
.guide-sheet__prose :deep(ol) {
  margin: 0 0 0.875rem;
  padding-left: 1.25rem;
}

.guide-sheet__prose :deep(li) {
  margin-bottom: 0.375rem;
}

.guide-sheet__prose :deep(li > ul),
.guide-sheet__prose :deep(li > ol) {
  margin: 0.375rem 0 0;
}

.guide-sheet__prose :deep(strong) {
  font-weight: 700;
  color: #0f172a;
}

.guide-sheet__prose :deep(code) {
  border-radius: 0.25rem;
  background-color: #f1f5f9;
  padding: 0.1rem 0.3rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
  font-variant-numeric: tabular-nums;
}

.guide-sheet__prose :deep(a) {
  color: #1d4ed8;
  font-weight: 600;
}

/* Tables carry class limits, so they get the tabular figures the rest of the app uses. */
.guide-sheet__prose :deep(.guide-table) {
  margin: 0 0 1.25rem;
  overflow-x: auto;
}

.guide-sheet__prose :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.guide-sheet__prose :deep(th),
.guide-sheet__prose :deep(td) {
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem 0.75rem 0.5rem 0;
  text-align: left;
}

.guide-sheet__prose :deep(thead th) {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.guide-sheet-enter-active,
.guide-sheet-leave-active {
  transition: opacity 200ms ease;
}

.guide-sheet-enter-active .guide-sheet__panel,
.guide-sheet-leave-active .guide-sheet__panel {
  transition: transform 200ms ease;
}

.guide-sheet-enter-from,
.guide-sheet-leave-to {
  opacity: 0;
}

.guide-sheet-enter-from .guide-sheet__panel,
.guide-sheet-leave-to .guide-sheet__panel {
  transform: translateY(1rem);
}

@media (prefers-reduced-motion: reduce) {
  .guide-sheet-enter-active,
  .guide-sheet-leave-active,
  .guide-sheet-enter-active .guide-sheet__panel,
  .guide-sheet-leave-active .guide-sheet__panel {
    transition: none;
  }
}
</style>
