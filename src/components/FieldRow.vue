<script setup>
defineProps({
  label: { type: String, required: true },
  controlId: { type: String, required: true },
  // Rendered in muted parentheses after the label, for 'mm', 'in' or 'TPI'.
  unit: { type: String, default: '' },
  // A row whose control carries a caption underneath has to align its label to the top of
  // the control rather than to the middle of the pair.
  alignTop: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="grid gap-2 sm:grid-cols-[1fr_17rem] sm:gap-6"
    :class="alignTop ? 'sm:items-start' : 'sm:items-center'"
  >
    <div class="flex flex-wrap items-center gap-2" :class="alignTop ? 'sm:pt-3' : ''">
      <label class="text-sm font-bold text-slate-800" :for="controlId">
        {{ label }}
        <span v-if="unit" class="font-normal text-slate-500">({{ unit }})</span>
      </label>
      <slot name="badge" />
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>
