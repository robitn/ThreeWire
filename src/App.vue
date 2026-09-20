<script setup>
import { computed, ref, watch } from 'vue'
import { threadDatabase, threadStandards } from './data/threadDatabase'
import {
  defaultClassId,
  isThreadClassId,
  pitchDiameterLimitsMm,
  threadClassShort,
  threadClassesFor,
} from './lib/threadLimits'

const STORAGE_KEY = 'twowire:settings:v1'

const MODES = ['findE', 'findM']
const UNIT_SYSTEMS = ['metric', 'imperial']

const DEFAULT_MODE = 'findM'
const DEFAULT_UNIT_SYSTEM = 'imperial'
const DEFAULT_STANDARD_ID = 'unc'
const DEFAULT_THREAD_ID = 'unc-unc-1-4-external'
// Each standard's class system remembers its own choice, so moving between an inch thread
// and a metric one does not silently drop a class or carry a meaningless one across.
function readStoredClassIds(value) {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).filter(([systemId, classId]) => isThreadClassId(systemId, classId)),
  )
}

// Every supported standard has a nominal diameter to work from, so this only keeps the
// field numeric if a future catalog entry ever arrives without one.
const FALLBACK_TARGET_MEASUREMENT_MM = 12.7

function readStoredSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // Storage unavailable (private browsing) or the entry is not usable JSON.
    return {}
  }
}

// 'M6 x 1' and 'M0.25 x 0.075' both reduce to their nominal size; imperial designations
// ('1/4', '#1', 'G1/2') carry no pitch and pass through untouched.
function sizeOf(thread) {
  return thread.designation.replace(/\s*x\s*[\d.]+$/, '')
}

function findThread(threadId, standardId) {
  return threadDatabase.find(
    (thread) => thread.id === threadId && thread.standardId === standardId && thread.angle !== null,
  )
}

// Every stored value is re-validated against the thread database: ids can disappear when
// the generated table is regenerated, and the entry is user-editable in any case.
const stored = readStoredSettings()

const storedStandardId = threadStandards.some(
  (standard) => standard.id === stored.standardId && standard.angle !== null,
)
  ? stored.standardId
  : DEFAULT_STANDARD_ID

const storedThread =
  findThread(stored.threadId, storedStandardId) ??
  findThread(DEFAULT_THREAD_ID, storedStandardId) ??
  threadDatabase.find((thread) => thread.standardId === storedStandardId && thread.angle !== null)

const currentMode = ref(MODES.includes(stored.mode) ? stored.mode : DEFAULT_MODE)
const selectedClassIds = ref(readStoredClassIds(stored.classIds))
const unitSystem = ref(
  UNIT_SYSTEMS.includes(stored.unitSystem) ? stored.unitSystem : DEFAULT_UNIT_SYSTEM,
)

const unitLabel = computed(() => (unitSystem.value === 'metric' ? 'mm' : 'in'))
const displayDecimals = computed(() => (unitSystem.value === 'metric' ? 4 : 5))

function toDisplay(value) {
  return unitSystem.value === 'metric' ? value : value / 25.4
}

function toMillimeters(value) {
  return unitSystem.value === 'metric' ? value : value * 25.4
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

// Derived values are rounded for display, but a value the user typed is handed straight
// back so a rounding getter never rewrites the field mid-keystroke.
function displayValue(typed, derived, decimals) {
  if (typed !== null && Math.abs(typed - derived) < 1e-9) return typed
  return roundTo(derived, decimals)
}

const selectedStandardId = ref(storedStandardId)
const selectedSize = ref(sizeOf(storedThread))
const selectedThreadId = ref(storedThread.id)

const supportedStandards = computed(() => threadStandards.filter((standard) => standard.angle !== null))

const standardThreads = computed(() =>
  threadDatabase.filter(
    (thread) => thread.standardId === selectedStandardId.value && thread.angle !== null,
  ),
)

const sizeOptions = computed(() => [...new Set(standardThreads.value.map(sizeOf))])

const selectedStandard = computed(() =>
  threadStandards.find((standard) => standard.id === selectedStandardId.value),
)

// How a pitch is quoted is a property of the standard, not of the display units: a metric
// ISO thread is a peak-to-peak distance in millimetres whatever units the readouts use,
// and an inch-series thread is threads per inch.
const pitchIsLength = computed(() => selectedStandard.value?.system === 'metric')
const pitchFieldLabel = computed(() => (pitchIsLength.value ? 'mm' : 'TPI'))

// The length readout would only repeat the option it sits under.
const showsPitchLength = computed(() => !(pitchIsLength.value && unitSystem.value === 'metric'))

// Coarsest first, which is how a size's pitches are normally listed.
const pitchOptions = computed(() =>
  standardThreads.value
    .filter((thread) => sizeOf(thread) === selectedSize.value)
    .sort((first, second) => second.pitch - first.pitch),
)

// Standard and size narrow the table down to a set of pitches; picking one picks the thread.
// The chain ends at storedThread, which the restore path already proved valid, so the rest
// of the sheet can treat a thread as always present.
const selectedThread = computed(
  () =>
    threadDatabase.find((thread) => thread.id === selectedThreadId.value) ??
    pitchOptions.value[0] ??
    standardThreads.value[0] ??
    storedThread,
)

const pitchMm = computed(() => selectedThread.value.pitch)
const threadAngle = computed(() => selectedThread.value.angle)
const halfAngleRad = computed(() => (threadAngle.value / 2) * (Math.PI / 180))

// The best-size wire is the one that touches each flank exactly at the pitch line, where
// flank contact is insensitive to how far the wire sinks into the groove.
const bestWireSize = computed(() => pitchMm.value / (2 * Math.cos(halfAngleRad.value)))

// null override means the wire size follows bestWireSize; typing a value pins it.
const wireSizeOverrideMm = ref(
  Number.isFinite(stored.wireSizeMm) && stored.wireSizeMm > 0 ? stored.wireSizeMm : null,
)
const isWireSizeCustom = computed(() => wireSizeOverrideMm.value !== null)
const effectiveWireSize = computed(() => wireSizeOverrideMm.value ?? bestWireSize.value)

// Three-wire geometry: a wire of diameter W in the groove stands W * (1 + 1/sin(half angle))
// proud of the flank contact, and the sharp-V apex of the groove sits (P/2) * cot(half angle)
// below the pitch line. Both coefficients follow the thread angle. At 60 deg they collapse to
// the familiar 3W - 0.86603P, but a 55 deg Whitworth form needs 3.16568W - 0.96049P, so
// neither can be hardcoded while the catalog carries BSP.
const wireContribution = computed(
  () => effectiveWireSize.value * (1 + 1 / Math.sin(halfAngleRad.value)),
)
const pitchContribution = computed(() => pitchMm.value / (2 * Math.tan(halfAngleRad.value)))

function measurementOverWires(pitchDiameter) {
  return pitchDiameter + wireContribution.value - pitchContribution.value
}

function pitchDiameterOverWires(measurement) {
  return measurement - wireContribution.value + pitchContribution.value
}

// The basic pitch diameter: the theoretical size, before any class of fit narrows it. The
// thread catalog carries no tolerance data, so this is all geometry, and it is what a
// thread without an applicable class has to be measured against.
const nominalPitchDiameterMm = computed(() => {
  const nominalDiameter = selectedThread.value.nominalDiameterMm
  const factor = selectedStandard.value?.pitchDiameterFactor
  if (!nominalDiameter || !factor) return null

  return nominalDiameter - factor * pitchMm.value
})

// Which classes exist is a property of the standard: ASME B1.1 for the inch series, ISO 965
// for metric, and nothing for BSP, whose system the calculator does not implement.
const threadClassSystem = computed(() => selectedStandard.value?.threadClassSystem ?? null)
const threadClasses = computed(() => threadClassesFor(selectedStandard.value))
const supportsThreadClasses = computed(() => threadClasses.value.length > 0)

const activeClassId = computed(() => {
  const system = threadClassSystem.value
  if (!system) return 'basic'

  return selectedClassIds.value[system] ?? defaultClassId(system)
})

const selectedClassId = computed({
  get: () => activeClassId.value,
  set: (value) => {
    const system = threadClassSystem.value
    if (!system) return

    selectedClassIds.value = { ...selectedClassIds.value, [system]: value }
  },
})

const classLimitsMm = computed(() =>
  pitchDiameterLimitsMm(selectedThread.value, selectedStandard.value, activeClassId.value),
)

// What the thread is actually cut to. Class 2A carries a clearance allowance that puts its
// maximum below the basic size; Class 3A has none, so its maximum is the basic size itself.
// Without a class there is only the basic pitch diameter to aim at.
const targetPitchDiameterMm = computed(
  () => classLimitsMm.value?.maxMm ?? nominalPitchDiameterMm.value,
)

// Each limit of the class, expressed as the two numbers on the bench: the pitch diameter
// itself, and what a micrometer should read over the wires currently in use.
const pitchDiameterRangeMm = computed(() => classLimitsMm.value)
const measurementRangeMm = computed(() => {
  const limits = classLimitsMm.value
  if (!limits) return null

  return {
    minMm: measurementOverWires(limits.minMm),
    maxMm: measurementOverWires(limits.maxMm),
  }
})

// The field holds M in findE mode and E in findM mode, so the value it starts from has to
// follow the mode. Both describe the same thread, so toggling round-trips.
const catalogTargetMm = computed(() => {
  const pitchDiameter = targetPitchDiameterMm.value
  if (pitchDiameter === null || pitchDiameter === undefined) return null

  return currentMode.value === 'findE' ? measurementOverWires(pitchDiameter) : pitchDiameter
})

// null override means the measurement follows the selected thread, as the wire size follows
// the best size; typing a value pins it.
const targetMeasurementOverrideMm = ref(null)
const isTargetMeasurementCustom = computed(() => targetMeasurementOverrideMm.value !== null)
const targetMeasurementMm = computed(
  () => targetMeasurementOverrideMm.value ?? catalogTargetMm.value ?? FALLBACK_TARGET_MEASUREMENT_MM,
)

const result = computed(() =>
  currentMode.value === 'findE'
    ? pitchDiameterOverWires(targetMeasurementMm.value)
    : measurementOverWires(targetMeasurementMm.value),
)

const resultLabel = computed(() =>
  currentMode.value === 'findE' ? 'Pitch diameter' : 'Measure over wires',
)

// The class applies to the pitch diameter, which is the result in findE mode and the input
// in findM mode.
const pitchDiameterValueMm = computed(() =>
  currentMode.value === 'findE' ? result.value : targetMeasurementMm.value,
)

const classVerdict = computed(() => {
  const limits = classLimitsMm.value
  const pitchDiameter = pitchDiameterValueMm.value
  if (!limits || !Number.isFinite(pitchDiameter)) return null

  if (pitchDiameter < limits.minMm - 1e-9) return 'under'
  if (pitchDiameter > limits.maxMm + 1e-9) return 'over'
  return 'within'
})

// Under the input goes the range for what the input means; beside the result, the range for
// what the result means.
const fieldRangeMm = computed(() =>
  currentMode.value === 'findE' ? measurementRangeMm.value : pitchDiameterRangeMm.value,
)
const resultRangeMm = computed(() =>
  currentMode.value === 'findE' ? pitchDiameterRangeMm.value : measurementRangeMm.value,
)

const typedWireSize = ref(null)
const typedTargetMeasurement = ref(null)

function pitchOptionLabel(thread) {
  return pitchIsLength.value
    ? String(roundTo(thread.pitch, 4))
    : String(roundTo(25.4 / thread.pitch, 4))
}

const wireSizeDisplay = computed({
  get: () =>
    displayValue(typedWireSize.value, toDisplay(effectiveWireSize.value), displayDecimals.value),
  set: (value) => {
    const next = Number(value)
    if (!Number.isFinite(next) || next <= 0) return

    typedWireSize.value = next
    wireSizeOverrideMm.value = toMillimeters(next)
  },
})

const targetMeasurementDisplay = computed({
  get: () =>
    displayValue(
      typedTargetMeasurement.value,
      toDisplay(targetMeasurementMm.value),
      displayDecimals.value,
    ),
  set: (value) => {
    const next = Number(value)
    if (!Number.isFinite(next)) return

    typedTargetMeasurement.value = next
    targetMeasurementOverrideMm.value = toMillimeters(next)
  },
})

const pitchLengthDisplay = computed(() => toDisplay(pitchMm.value))
const catalogTargetDisplay = computed(() =>
  catalogTargetMm.value === null ? null : toDisplay(catalogTargetMm.value),
)

const classShortLabel = computed(() =>
  threadClassShort(threadClassSystem.value, activeClassId.value),
)

const classSystemLabel = computed(() =>
  threadClassSystem.value === 'iso-965' ? 'ISO 965' : 'ASME B1.1',
)

function formatRange(range) {
  if (!range) return null

  const low = toDisplay(range.minMm).toFixed(displayDecimals.value)
  const high = toDisplay(range.maxMm).toFixed(displayDecimals.value)
  return `${low} to ${high}`
}

const fieldRangeDisplay = computed(() => formatRange(fieldRangeMm.value))
const resultRangeDisplay = computed(() => formatRange(resultRangeMm.value))

const targetSourceLabel = computed(() =>
  classLimitsMm.value ? `${classShortLabel.value} max` : 'Nominal',
)

const verdictLabel = computed(() => {
  if (classVerdict.value === 'within') return `Within ${classShortLabel.value}`
  if (classVerdict.value === 'under') return `Under ${classShortLabel.value} min`
  if (classVerdict.value === 'over') return `Over ${classShortLabel.value} max`
  return null
})
const resultDisplay = computed(() => toDisplay(result.value))
const bestWireSizeDisplay = computed(() => toDisplay(bestWireSize.value))

function selectSize() {
  const options = pitchOptions.value
  if (!options.length) return

  // Hold the pitch when the new size offers it, so stepping through sizes is not disruptive.
  const samePitch = options.find((thread) => thread.pitch === selectedThread.value.pitch)
  selectedThreadId.value = (samePitch ?? options[0]).id
}

function selectStandard() {
  const [firstSize] = sizeOptions.value
  if (!firstSize) return

  selectedSize.value = firstSize
  selectSize()
}

function useBestWireSize() {
  wireSizeOverrideMm.value = null
  typedWireSize.value = null
}

function useTargetMeasurement() {
  targetMeasurementOverrideMm.value = null
  typedTargetMeasurement.value = null
}

// The input means M in findE mode and E in findM mode, so carry the value just calculated
// into it: the toggle then round-trips instead of silently reinterpreting the old number.
// A measurement still following the catalog needs no carry, since catalogTargetMm switches
// sides on its own.
function setMode(mode) {
  if (mode === currentMode.value) return

  const carried = result.value
  currentMode.value = mode
  typedTargetMeasurement.value = null

  if (isTargetMeasurementCustom.value && Number.isFinite(carried) && carried > 0) {
    targetMeasurementOverrideMm.value = carried
  }
}

function setUnitSystem(system) {
  if (system === unitSystem.value) return

  unitSystem.value = system
  typedWireSize.value = null
  typedTargetMeasurement.value = null
}

// A reading belongs to the thread it was taken on, so picking another thread drops it and
// shows what the new one should measure. Changing class is not a new thread, so a reading
// survives it and simply gets judged against the new limits. Wires are not per-thread
// either: a custom wire size is the set on the bench, so that one survives too.
watch(selectedThreadId, useTargetMeasurement)

// Measurements are per-job and start fresh; the setup around them is remembered.
watch(
  [currentMode, unitSystem, selectedStandardId, selectedThreadId, wireSizeOverrideMm, selectedClassIds],
  ([mode, units, standardId, threadId, wireSizeMm, classIds]) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, unitSystem: units, standardId, threadId, wireSizeMm, classIds }),
      )
    } catch {
      // Storage unavailable or full: the session still works, it just will not be restored.
    }
  },
)
</script>

<template>
  <main class="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 sm:py-10">
    <div class="mx-auto max-w-3xl">
      <header class="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Workshop tool</p>
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Thread Wire Calculator</h1>
          <p class="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Solve pitch diameter or measure over wires with a three-wire method.
          </p>
        </div>
        <div class="hidden rounded-2xl bg-white p-3 text-blue-700 shadow-sm ring-1 ring-slate-200 sm:block" aria-hidden="true">
          <span class="block h-3 w-3 rounded-full bg-current"></span>
          <span class="mt-1 block h-3 w-3 rounded-full border-2 border-current"></span>
        </div>
      </header>

      <nav class="mb-5 grid grid-cols-2 rounded-2xl bg-slate-200 p-1.5 shadow-inner" aria-label="Calculation mode">
        <button
          class="rounded-xl px-3 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          :class="currentMode === 'findE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
          type="button"
          data-testid="mode-find-e"
          :aria-pressed="currentMode === 'findE'"
          @click="setMode('findE')"
        >
          Find pitch diameter
        </button>
        <button
          class="rounded-xl px-3 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          :class="currentMode === 'findM' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
          type="button"
          data-testid="mode-find-m"
          :aria-pressed="currentMode === 'findM'"
          @click="setMode('findM')"
        >
          Find measure over wires
        </button>
      </nav>

      <div class="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <span class="px-3 text-sm font-bold text-slate-800">Display units</span>
        <div class="grid w-44 grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Display units">
          <button
            class="rounded-lg px-2 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            :class="unitSystem === 'metric' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
            type="button"
            data-testid="units-metric"
            :aria-pressed="unitSystem === 'metric'"
            @click="setUnitSystem('metric')"
          >
            Metric
          </button>
          <button
            class="rounded-lg px-2 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            :class="unitSystem === 'imperial' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
            type="button"
            data-testid="units-imperial"
            :aria-pressed="unitSystem === 'imperial'"
            @click="setUnitSystem('imperial')"
          >
            Imperial
          </button>
        </div>
      </div>

      <section class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div class="mb-7 flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 class="text-lg font-bold">Calculation inputs</h2>
            <p class="mt-1 text-sm text-slate-500">Values update instantly as you work.</p>
          </div>
          <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">3-wire method</span>
        </div>

        <div class="space-y-5">
          <div class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-center sm:gap-6">
            <label class="text-sm font-bold text-slate-800" for="thread-standard">Thread standard</label>
            <select
              id="thread-standard"
              v-model="selectedStandardId"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              data-testid="thread-standard"
              @change="selectStandard"
            >
              <option v-for="standard in supportedStandards" :key="standard.id" :value="standard.id">
                {{ standard.label }}
              </option>
            </select>
          </div>

          <div class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-center sm:gap-6">
            <label class="text-sm font-bold text-slate-800" for="fastener-size">Fastener size</label>
            <select
              id="fastener-size"
              v-model="selectedSize"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              data-testid="fastener-size"
              @change="selectSize"
            >
              <option v-for="size in sizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </div>

          <div class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-start sm:gap-6">
            <label class="text-sm font-bold text-slate-800 sm:pt-3" for="pitch">
              Pitch <span class="font-normal text-slate-500">({{ pitchFieldLabel }})</span>
            </label>
            <div>
              <select
                id="pitch"
                v-model="selectedThreadId"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold tabular-nums shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                data-testid="pitch"
              >
                <option v-for="thread in pitchOptions" :key="thread.id" :value="thread.id">
                  {{ pitchOptionLabel(thread) }}
                </option>
              </select>
              <p
                v-if="showsPitchLength"
                class="mt-1.5 text-right text-xs text-slate-500 tabular-nums"
                data-testid="pitch-length"
              >
                = {{ pitchLengthDisplay.toFixed(displayDecimals) }} {{ unitLabel }} pitch
              </p>
            </div>
          </div>

          <div
            v-if="supportsThreadClasses"
            class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-center sm:gap-6"
          >
            <label class="text-sm font-bold text-slate-800" for="thread-class">Class of fit</label>
            <select
              id="thread-class"
              v-model="selectedClassId"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              data-testid="thread-class"
            >
              <option v-for="threadClass in threadClasses" :key="threadClass.id" :value="threadClass.id">
                {{ threadClass.label }}
              </option>
            </select>
          </div>

          <div class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-start sm:gap-6">
            <div class="flex flex-wrap items-center gap-2 sm:pt-3">
              <label class="text-sm font-bold text-slate-800" for="wire-size">
                Wire size <span class="font-normal text-slate-500">({{ unitLabel }})</span>
              </label>
              <span
                class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                :class="isWireSizeCustom ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
                data-testid="wire-size-mode"
              >
                {{ isWireSizeCustom ? 'Custom' : 'Auto' }}
              </span>
            </div>
            <div>
              <input
                id="wire-size"
                v-model.number="wireSizeDisplay"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold tabular-nums shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                type="number"
                min="0"
                step="any"
                inputmode="decimal"
                data-testid="wire-size"
              />
              <div v-if="isWireSizeCustom" class="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span class="tabular-nums">Best {{ bestWireSizeDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</span>
                <button
                  class="rounded font-bold text-blue-700 transition hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  type="button"
                  data-testid="use-best-wire"
                  @click="useBestWireSize"
                >
                  Use best wire
                </button>
              </div>
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:items-start sm:gap-6">
            <div class="flex flex-wrap items-center gap-2 sm:pt-3">
              <label class="text-sm font-bold text-slate-800" for="target-measurement">
                {{ currentMode === 'findE' ? 'Measure over wires' : 'Pitch diameter' }}
                <span class="font-normal text-slate-500">({{ unitLabel }})</span>
              </label>
              <span
                class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                :class="isTargetMeasurementCustom ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'"
                data-testid="target-measurement-mode"
              >
                {{ isTargetMeasurementCustom ? 'Measured' : targetSourceLabel }}
              </span>
            </div>
            <div>
              <input
                id="target-measurement"
                v-model.number="targetMeasurementDisplay"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold tabular-nums shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                type="number"
                min="0"
                step="any"
                inputmode="decimal"
                data-testid="target-measurement"
              />
              <div
                v-if="fieldRangeDisplay || (isTargetMeasurementCustom && catalogTargetDisplay !== null)"
                class="mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500"
              >
                <span v-if="fieldRangeDisplay" class="tabular-nums" data-testid="field-range">{{ classShortLabel }} {{ fieldRangeDisplay }} {{ unitLabel }}</span>
                <span v-else class="tabular-nums" data-testid="nominal-target">Nominal {{ catalogTargetDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</span>
                <button
                  v-if="isTargetMeasurementCustom"
                  class="rounded font-bold text-blue-700 transition hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  type="button"
                  data-testid="use-target-measurement"
                  @click="useTargetMeasurement"
                >
                  Use {{ classLimitsMm ? 'limit' : 'nominal' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-5 rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8" aria-live="polite">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-400">Calculated {{ resultLabel }}</p>
            <p class="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl" data-testid="result">
              {{ Number.isFinite(resultDisplay) ? resultDisplay.toFixed(displayDecimals) : '—' }}
              <span class="text-lg font-semibold text-slate-400">{{ unitLabel }}</span>
            </p>
            <div v-if="resultRangeDisplay" class="mt-3 flex flex-wrap items-center gap-2">
              <span class="text-sm tabular-nums text-slate-400" data-testid="result-range">{{ classShortLabel }} {{ resultRangeDisplay }} {{ unitLabel }}</span>
              <span
                v-if="verdictLabel"
                class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                :class="classVerdict === 'within' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'"
                data-testid="class-verdict"
              >
                {{ verdictLabel }}
              </span>
            </div>
          </div>
          <div class="rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-right">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Best wire size</p>
            <p class="mt-1 text-lg font-bold tabular-nums" data-testid="best-wire-size">{{ bestWireSizeDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</p>
          </div>
        </div>
        <p class="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-400">
          Best wire size uses W = P / (2 × cos(half thread angle)).
          <span v-if="classLimitsMm?.source === 'formula'" data-testid="class-source">
            ASME B1.1 does not table this size here, so its class limits come from the tolerance
            formula instead. Check them against the printed table before cutting to them.
          </span>
          <span v-else-if="activeClassId !== 'basic' && !classLimitsMm" data-testid="class-unavailable">
            This diameter and pitch is not a combination {{ classSystemLabel }} tabulates, so there
            are no {{ classShortLabel }} limits to show and the basic pitch diameter stands in.
          </span>
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped></style>
