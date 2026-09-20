<script setup>
defineProps({
  modelValue: { type: String, required: true },
  // Each option is { value, label, testId }.
  options: { type: Array, required: true },
  label: { type: String, required: true },
  // The mode switch is the loudest control on the page; the units switch sits quietly
  // beside its own label and wants to take up less room.
  compact: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div
    class="flex"
    :class="compact ? 'w-44 rounded-xl bg-slate-100 p-1' : 'rounded-2xl bg-slate-200 p-1.5 shadow-inner'"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      class="flex-1 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      :class="[
        compact ? 'rounded-lg px-2 py-2' : 'rounded-xl px-3 py-3',
        option.value === modelValue
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-800',
      ]"
      type="button"
      :data-testid="option.testId"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
