import { isThreadClassId } from './threadLimits'
import { isUnitSystem } from './units'

export const STORAGE_KEY = 'threewire:settings:v1'

export const MODES = ['findE', 'findM']

const DEFAULT_MODE = 'findM'
const DEFAULT_UNIT_SYSTEM = 'imperial'

// The app was called TwoWire before it was renamed, and localStorage is scoped to the
// origin rather than to the path, so the rename does not clear anyone's stored setup -- it
// only changes the key it is filed under. Without this a returning user would silently lose
// their standard, size and units, and be shown the guide again as though this were a first
// run. The old entries are left in place rather than deleted: they cost two keys, and
// removing them would strand anyone who went back to an older build.
const LEGACY_STORAGE_KEY = 'twowire:settings:v1'
const LEGACY_GUIDE_KEY = 'twowire:guide-seen:v1'

// Carries the old entry forward on first read, so the fallback is only ever needed once.
// Everything read this way still goes through the same validation as before.
function readRenamed(key, legacyKey) {
  const current = window.localStorage.getItem(key)
  if (current !== null) return current

  const legacy = window.localStorage.getItem(legacyKey)
  if (legacy !== null) window.localStorage.setItem(key, legacy)

  return legacy
}

function readRaw() {
  try {
    const raw = readRenamed(STORAGE_KEY, LEGACY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // Storage unavailable (private browsing) or the entry is not usable JSON.
    return {}
  }
}

// Each standard's class system remembers its own choice, so moving between an inch thread
// and a metric one does not silently drop a class or carry a meaningless one across.
function readClassIds(value) {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).filter(([systemId, classId]) => isThreadClassId(systemId, classId)),
  )
}

/**
 * The stored entry with every field checked. The thread selection is left raw for
 * restoreSelection() in threadCatalog.js, which is the piece that knows the catalog.
 */
export function readSettings() {
  const stored = readRaw()

  return {
    mode: MODES.includes(stored.mode) ? stored.mode : DEFAULT_MODE,
    unitSystem: isUnitSystem(stored.unitSystem) ? stored.unitSystem : DEFAULT_UNIT_SYSTEM,
    classIds: readClassIds(stored.classIds),
    wireSizeMm:
      Number.isFinite(stored.wireSizeMm) && stored.wireSizeMm > 0 ? stored.wireSizeMm : null,
    standardId: stored.standardId,
    threadId: stored.threadId,
  }
}

export function writeSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable or full: the session still works, it just will not be restored.
  }
}

// The guide flag lives under its own key rather than inside the settings entry, so bumping
// the settings schema never re-opens the guide at someone who has already read it.
export const GUIDE_KEY = 'threewire:guide-seen:v1'

/**
 * Whether the guide has been shown before. Storage being unavailable counts as seen: the
 * alternative is a private-browsing session that opens the manual on every single launch.
 */
export function readGuideSeen() {
  try {
    return readRenamed(GUIDE_KEY, LEGACY_GUIDE_KEY) !== null
  } catch {
    return true
  }
}

export function writeGuideSeen() {
  try {
    window.localStorage.setItem(GUIDE_KEY, new Date().toISOString())
  } catch {
    // Storage unavailable or full: the guide simply offers itself again next launch.
  }
}
