<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// How often to ask while the app just sits there, and the shortest gap between two asks.
// The gap keeps a flurry of tab switches from turning into a flurry of requests.
const POLL_INTERVAL_MS = 60 * 60 * 1000
const MIN_GAP_MS = 60 * 1000

let registration = null
let timer = null
let lastCheckedAt = 0

// needRefresh turns true once a new service worker has installed and is sitting in the
// waiting state. updateServiceWorker(true) tells that worker to skip waiting and take over,
// then reloads the page, which is what actually swaps the running assets for the new ones.
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_scriptUrl, swRegistration) {
    registration = swRegistration ?? null
  },
})

// The browser re-checks a worker on a schedule of its own that can run to hours, so left
// alone the toast would only ever turn up by luck. Asking has to be cheap and frequent
// enough that a new version is noticed without the app being killed and relaunched.
async function checkForUpdate() {
  if (!registration) return
  // An update check while offline just fails; there is no point spending the request.
  if (navigator.onLine === false) return

  const now = Date.now()
  if (now - lastCheckedAt < MIN_GAP_MS) return
  lastCheckedAt = now

  try {
    await registration.update()
  } catch {
    // Best effort only: the network went away, or the registration has gone. The prompt
    // stays hidden and the calculator carries on from the copy already cached.
  }
}

// Coming back to the app is the moment worth checking: on a phone it is what happens
// instead of a relaunch, since the page survives in the background and never remounts.
function checkWhenVisible() {
  if (document.visibilityState === 'visible') checkForUpdate()
}

onMounted(async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    // A worker registered on an earlier visit is already in charge and raises no
    // registration event, so onRegisteredSW above will not fire for it.
    registration = (await navigator.serviceWorker.getRegistration()) ?? registration
  } catch {
    return
  }

  await checkForUpdate()

  document.addEventListener('visibilitychange', checkWhenVisible)
  window.addEventListener('online', checkForUpdate)
  timer = setInterval(checkForUpdate, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', checkWhenVisible)
  window.removeEventListener('online', checkForUpdate)
  if (timer) clearInterval(timer)
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
