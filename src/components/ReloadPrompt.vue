<script setup>
import { onMounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// needRefresh turns true once a new service worker has installed and is sitting in the
// waiting state. updateServiceWorker(true) tells that worker to skip waiting and take over,
// then reloads the page, which is what actually swaps the running assets for the new ones.
const { needRefresh, updateServiceWorker } = useRegisterSW()

// A worker registered on an earlier visit already controls this page, so registering again
// raises no event for it and the browser re-checks it on a schedule of its own that can run
// to hours. Launching the app is exactly when someone would want to hear about a new
// version, so ask right away.
onMounted(async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    await registration?.update()
  } catch {
    // Best effort only: offline, or the registration has gone. The prompt stays hidden and
    // the calculator carries on working from the copy already cached.
  }
})

function update() {
  updateServiceWorker(true)
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <Transition name="reload-prompt">
    <aside
      v-if="needRefresh"
      class="reload-prompt"
      role="status"
      aria-live="polite"
      data-testid="reload-prompt"
    >
      <div>
        <p class="reload-prompt__title">A new version is ready</p>
        <p class="reload-prompt__body">
          Reload to pick it up. Your measurement is not carried across.
        </p>
      </div>
      <div class="reload-prompt__actions">
        <button
          class="reload-prompt__button reload-prompt__button--quiet"
          type="button"
          data-testid="reload-prompt-close"
          @click="dismiss"
        >
          Close
        </button>
        <button
          class="reload-prompt__button reload-prompt__button--primary"
          type="button"
          data-testid="reload-prompt-update"
          @click="update"
        >
          Update
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.reload-prompt {
  /* Nothing else in the app declares a z-index, so this only has to clear the default
     stacking order. Pinned bottom right on a desktop; on a narrow screen the left inset
     and auto margin let it stretch to the full width instead of hugging one corner. */
  position: fixed;
  z-index: 100;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  left: 1rem;
  max-width: 22rem;
  margin-left: auto;

  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem 1.125rem;

  /* Matches the card treatment the rest of the sheet uses: white on a hairline slate ring,
     with the same shadow as the result panel. */
  border-radius: 1rem;
  background-color: #ffffff;
  outline: 1px solid #e2e8f0;
  outline-offset: -1px;
  box-shadow:
    0 10px 15px -3px rgb(2 6 23 / 0.15),
    0 4px 6px -4px rgb(2 6 23 / 0.1);
}

.reload-prompt__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #020617;
}

.reload-prompt__body {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: #475569;
}

.reload-prompt__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.reload-prompt__button {
  border: none;
  border-radius: 0.625rem;
  padding: 0.5rem 0.875rem;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

.reload-prompt__button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.reload-prompt__button--primary {
  background-color: #1d4ed8;
  color: #ffffff;
}

.reload-prompt__button--primary:hover {
  background-color: #1e40af;
}

.reload-prompt__button--quiet {
  background-color: transparent;
  color: #475569;
}

.reload-prompt__button--quiet:hover {
  color: #0f172a;
}

.reload-prompt-enter-active,
.reload-prompt-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.reload-prompt-enter-from,
.reload-prompt-leave-to {
  opacity: 0;
  transform: translateY(0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .reload-prompt-enter-active,
  .reload-prompt-leave-active {
    transition: none;
  }
}
</style>
