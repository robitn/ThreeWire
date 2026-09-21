<script setup>
import { computed, ref, watch } from 'vue'
import FieldRow from './components/FieldRow.vue'
import GuideSheet from './components/GuideSheet.vue'
import ReloadPrompt from './components/ReloadPrompt.vue'
import SegmentedControl from './components/SegmentedControl.vue'
import StatusBadge from './components/StatusBadge.vue'
import {
  calculableStandards,
  pitchesForSize,
  restoreSelection,
  sizesInStandard,
  standardById,
  threadById,
  threadsInStandard,
} from './lib/threadCatalog'
import {
  basicPitchDiameterMm,
  bestWireDiameterMm,
  measurementOverWiresMm,
  pitchDiameterOverWiresMm,
  sizeOf,
} from './lib/threadGeometry'
import {
  defaultClassId,
  pitchDiameterLimitsMm,
  threadClassesFor,
  threadClassShort,
} from './lib/threadLimits'
import {
  readGuideSeen,
  readSettings,
  writeGuideSeen,
  writeSettings,
} from './lib/settingsStorage'
import * as units from './lib/units'

// Every supported standard has a nominal diameter to work from, so this only keeps the
// field numeric if a future catalog entry ever arrives without one.
const FALLBACK_TARGET_MEASUREMENT_MM = 12.7

const MODE_OPTIONS = [
  { value: 'findE', label: 'Find pitch diameter', testId: 'mode-find-e' },
  { value: 'findM', label: 'Find measure over wires', testId: 'mode-find-m' },
]

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric', testId: 'units-metric' },
  { value: 'imperial', label: 'Imperial', testId: 'units-imperial' },
]

// Shared looks, named so the six controls in the sheet cannot drift apart.
const CONTROL_CLASSES =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm font-semibold shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const CAPTION_CLASSES = 'mt-1.5 flex items-center justify-between gap-3 text-xs text-slate-500'
const LINK_CLASSES =
  'rounded font-bold text-blue-700 transition hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2'

const stored = readSettings()
const { standardId: restoredStandardId, thread: restoredThread } = restoreSelection(stored)

const currentMode = ref(stored.mode)
const unitSystem = ref(stored.unitSystem)
const selectedClassIds = ref(stored.classIds)
const selectedStandardId = ref(restoredStandardId)
const selectedSize = ref(sizeOf(restoredThread))
const selectedThreadId = ref(restoredThread.id)

/* The guide ----------------------------------------------------------------------------- */

// Offered once, on the first run, and never again on its own. A tool someone reaches for
// weekly should not re-offer its manual on a timer: a prompt raised when nothing has
// changed teaches people to dismiss prompts, including the one about a new version. The
// header button keeps the guide a tap away for the rest of the time.
const guideOpen = ref(!readGuideSeen())

function openGuide() {
  guideOpen.value = true
}

function closeGuide() {
  guideOpen.value = false
  writeGuideSeen()
}

/* Units ------------------------------------------------------------------------------- */

const unitLabel = computed(() => units.unitLabel(unitSystem.value))
const displayDecimals = computed(() => units.displayDecimals(unitSystem.value))

function toDisplay(valueMm) {
  return units.toDisplay(valueMm, unitSystem.value)
}

function toMillimeters(value) {
  return units.toMillimeters(value, unitSystem.value)
}

/* Thread selection -------------------------------------------------------------------- */

const selectedStandard = computed(() => standardById(selectedStandardId.value))
const sizeOptions = computed(() => sizesInStandard(selectedStandardId.value))

// Standard and size narrow the table down to a set of pitches; picking one picks the thread.
// The chain ends at restoredThread, which the restore path already proved valid, so the rest
// of the sheet can treat a thread as always present.
const pitchOptions = computed(() => pitchesForSize(selectedStandardId.value, selectedSize.value))
const selectedThread = computed(
  () =>
    threadById(selectedThreadId.value) ??
    pitchOptions.value[0] ??
    threadsInStandard(selectedStandardId.value)[0] ??
    restoredThread,
)

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

// How a pitch is quoted is a property of the standard, not of the display units: a metric
// ISO thread is a peak-to-peak distance in millimetres whatever units the readouts use,
// and an inch-series thread is threads per inch.
const pitchIsLength = computed(() => selectedStandard.value?.system === 'metric')
const pitchFieldLabel = computed(() => (pitchIsLength.value ? 'mm' : 'TPI'))

// The length readout would only repeat the option it sits under.
const showsPitchLength = computed(() => !(pitchIsLength.value && unitSystem.value === 'metric'))

function pitchOptionLabel(thread) {
  return pitchIsLength.value
    ? String(units.roundTo(thread.pitch, 4))
    : String(units.roundTo(units.MM_PER_INCH / thread.pitch, 4))
}

/* Wire size --------------------------------------------------------------------------- */

const bestWireSize = computed(() => bestWireDiameterMm(selectedThread.value))

// null override means the wire size follows the best size; typing a value pins it.
const wireSizeOverrideMm = ref(stored.wireSizeMm)
const isWireSizeCustom = computed(() => wireSizeOverrideMm.value !== null)
const effectiveWireSize = computed(() => wireSizeOverrideMm.value ?? bestWireSize.value)

/* Class of fit ------------------------------------------------------------------------ */

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

/* The calculation ---------------------------------------------------------------------- */

function overWires(pitchDiameterMm) {
  return measurementOverWiresMm(pitchDiameterMm, selectedThread.value, effectiveWireSize.value)
}

function fromWires(measurementMm) {
  return pitchDiameterOverWiresMm(measurementMm, selectedThread.value, effectiveWireSize.value)
}

// What the thread is actually cut to. Class 2A carries a clearance allowance that puts its
// maximum below the basic size; Class 3A has none, so its maximum is the basic size itself.
// Without a class there is only the basic pitch diameter to aim at.
const targetPitchDiameterMm = computed(
  () =>
    classLimitsMm.value?.maxMm ??
    basicPitchDiameterMm(selectedThread.value, selectedStandard.value),
)

// Each limit of the class, expressed as the two numbers on the bench: the pitch diameter
// itself, and what a micrometer should read over the wires currently in use.
const measurementRangeMm = computed(() => {
  const limits = classLimitsMm.value
  if (!limits) return null

  return { minMm: overWires(limits.minMm), maxMm: overWires(limits.maxMm) }
})

// The field holds M in findE mode and E in findM mode, so the value it starts from has to
// follow the mode. Both describe the same thread, so toggling round-trips.
const catalogTargetMm = computed(() => {
  const pitchDiameter = targetPitchDiameterMm.value
  if (pitchDiameter === null || pitchDiameter === undefined) return null

  return currentMode.value === 'findE' ? overWires(pitchDiameter) : pitchDiameter
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
    ? fromWires(targetMeasurementMm.value)
    : overWires(targetMeasurementMm.value),
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
  currentMode.value === 'findE' ? measurementRangeMm.value : classLimitsMm.value,
)
const resultRangeMm = computed(() =>
  currentMode.value === 'findE' ? classLimitsMm.value : measurementRangeMm.value,
)

/* Editable fields ----------------------------------------------------------------------- */

const typedWireSize = ref(null)
const typedTargetMeasurement = ref(null)

const wireSizeDisplay = computed({
  get: () =>
    units.displayValue(
      typedWireSize.value,
      toDisplay(effectiveWireSize.value),
      displayDecimals.value,
    ),
  set: (value) => {
    const next = Number(value)
    if (!Number.isFinite(next) || next <= 0) return

    typedWireSize.value = next
    wireSizeOverrideMm.value = toMillimeters(next)
  },
})

const targetMeasurementDisplay = computed({
  get: () =>
    units.displayValue(
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

function useBestWireSize() {
  wireSizeOverrideMm.value = null
  typedWireSize.value = null
}

function useTargetMeasurement() {
  targetMeasurementOverrideMm.value = null
  typedTargetMeasurement.value = null
}

/* Readouts ------------------------------------------------------------------------------ */

const pitchLengthDisplay = computed(() => toDisplay(selectedThread.value.pitch))
const resultDisplay = computed(() => toDisplay(result.value))
const bestWireSizeDisplay = computed(() => toDisplay(bestWireSize.value))
const catalogTargetDisplay = computed(() =>
  catalogTargetMm.value === null ? null : toDisplay(catalogTargetMm.value),
)

// Injected at build time by vite.config.js. Static, so it is read once rather than tracked.
const buildLabel = `v${__APP_VERSION__} · ${__BUILD_REF__}`

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

/* Mode, units and persistence ------------------------------------------------------------ */

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
  [
    currentMode,
    unitSystem,
    selectedStandardId,
    selectedThreadId,
    wireSizeOverrideMm,
    selectedClassIds,
  ],
  ([mode, unitSystemId, standardId, threadId, wireSizeMm, classIds]) => {
    writeSettings({
      mode,
      unitSystem: unitSystemId,
      standardId,
      threadId,
      wireSizeMm,
      classIds,
    })
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
        <button
          class="flex flex-none items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-blue-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          type="button"
          data-testid="open-guide"
          @click="openGuide"
        >
          <!-- The three wires as they actually sit: a pair in adjacent grooves on one side,
               the third in the groove between them on the other. -->
          <span class="flex flex-col items-center gap-1" aria-hidden="true">
            <span class="flex gap-1">
              <span class="block h-3 w-3 rounded-full bg-current"></span>
              <span class="block h-3 w-3 rounded-full bg-current"></span>
            </span>
            <span class="block h-3 w-3 rounded-full border-2 border-current"></span>
          </span>
          <span class="text-sm font-bold">Guide</span>
        </button>
      </header>

      <SegmentedControl
        class="mb-5"
        :model-value="currentMode"
        :options="MODE_OPTIONS"
        label="Calculation mode"
        @update:model-value="setMode"
      />

      <div class="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <span class="px-3 text-sm font-bold text-slate-800">Display units</span>
        <SegmentedControl
          compact
          :model-value="unitSystem"
          :options="UNIT_OPTIONS"
          label="Display units"
          @update:model-value="setUnitSystem"
        />
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
          <FieldRow label="Thread standard" control-id="thread-standard">
            <select
              id="thread-standard"
              v-model="selectedStandardId"
              :class="CONTROL_CLASSES"
              data-testid="thread-standard"
              @change="selectStandard"
            >
              <option v-for="standard in calculableStandards" :key="standard.id" :value="standard.id">
                {{ standard.label }}
              </option>
            </select>
          </FieldRow>

          <FieldRow label="Fastener size" control-id="fastener-size">
            <select
              id="fastener-size"
              v-model="selectedSize"
              :class="CONTROL_CLASSES"
              data-testid="fastener-size"
              @change="selectSize"
            >
              <option v-for="size in sizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
          </FieldRow>

          <FieldRow label="Pitch" control-id="pitch" :unit="pitchFieldLabel" align-top>
            <select
              id="pitch"
              v-model="selectedThreadId"
              :class="[CONTROL_CLASSES, 'tabular-nums']"
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
          </FieldRow>

          <FieldRow v-if="supportsThreadClasses" label="Class of fit" control-id="thread-class">
            <select
              id="thread-class"
              v-model="selectedClassId"
              :class="CONTROL_CLASSES"
              data-testid="thread-class"
            >
              <option v-for="threadClass in threadClasses" :key="threadClass.id" :value="threadClass.id">
                {{ threadClass.label }}
              </option>
            </select>
          </FieldRow>

          <FieldRow label="Wire size" control-id="wire-size" :unit="unitLabel" align-top>
            <template #badge>
              <StatusBadge :tone="isWireSizeCustom ? 'warn' : 'info'" data-testid="wire-size-mode">
                {{ isWireSizeCustom ? 'Custom' : 'Auto' }}
              </StatusBadge>
            </template>

            <input
              id="wire-size"
              v-model.number="wireSizeDisplay"
              :class="[CONTROL_CLASSES, 'tabular-nums']"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              data-testid="wire-size"
            />
            <div v-if="isWireSizeCustom" :class="CAPTION_CLASSES">
              <span class="tabular-nums">Best {{ bestWireSizeDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</span>
              <button
                :class="LINK_CLASSES"
                type="button"
                data-testid="use-best-wire"
                @click="useBestWireSize"
              >
                Use best wire
              </button>
            </div>
          </FieldRow>

          <FieldRow
            :label="currentMode === 'findE' ? 'Measure over wires' : 'Pitch diameter'"
            control-id="target-measurement"
            :unit="unitLabel"
            align-top
          >
            <template #badge>
              <StatusBadge
                :tone="isTargetMeasurementCustom ? 'warn' : 'info'"
                data-testid="target-measurement-mode"
              >
                {{ isTargetMeasurementCustom ? 'Measured' : targetSourceLabel }}
              </StatusBadge>
            </template>

            <input
              id="target-measurement"
              v-model.number="targetMeasurementDisplay"
              :class="[CONTROL_CLASSES, 'tabular-nums']"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              data-testid="target-measurement"
            />
            <div
              v-if="fieldRangeDisplay || (isTargetMeasurementCustom && catalogTargetDisplay !== null)"
              :class="CAPTION_CLASSES"
            >
              <span v-if="fieldRangeDisplay" class="tabular-nums" data-testid="field-range">{{ classShortLabel }} {{ fieldRangeDisplay }} {{ unitLabel }}</span>
              <span v-else class="tabular-nums" data-testid="nominal-target">Nominal {{ catalogTargetDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</span>
              <button
                v-if="isTargetMeasurementCustom"
                :class="LINK_CLASSES"
                type="button"
                data-testid="use-target-measurement"
                @click="useTargetMeasurement"
              >
                Use {{ classLimitsMm ? 'limit' : 'nominal' }}
              </button>
            </div>
          </FieldRow>
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
              <StatusBadge
                v-if="verdictLabel"
                :tone="classVerdict === 'within' ? 'okOnDark' : 'warnOnDark'"
                data-testid="class-verdict"
              >
                {{ verdictLabel }}
              </StatusBadge>
            </div>
          </div>
          <div class="rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-right">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Best wire size</p>
            <p class="mt-1 text-lg font-bold tabular-nums" data-testid="best-wire-size">{{ bestWireSizeDisplay.toFixed(displayDecimals) }} {{ unitLabel }}</p>
          </div>
        </div>
        <div class="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-4">
          <p class="max-w-prose text-xs leading-5 text-slate-400">
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
          <p class="ml-auto text-xs tabular-nums text-slate-500" data-testid="build-version">{{ buildLabel }}</p>
        </div>
      </section>
    </div>
  </main>

  <GuideSheet :open="guideOpen" @close="closeGuide" />
  <ReloadPrompt />
</template>

<style scoped></style>
