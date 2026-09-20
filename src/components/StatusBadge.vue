<script>
// Declared in a plain script block so the prop validator below can see it: defineProps is
// hoisted out of setup and cannot reach a binding declared inside it.
export const TONES = {
  info: 'bg-blue-50 text-blue-700',
  warn: 'bg-amber-50 text-amber-700',
  // The result panel is slate-950, so its badges need their own pair.
  okOnDark: 'bg-emerald-400/15 text-emerald-300',
  warnOnDark: 'bg-amber-400/15 text-amber-300',
}
</script>

<script setup>
defineProps({
  tone: {
    type: String,
    default: 'info',
    validator: (value) => Object.hasOwn(TONES, value),
  },
})
</script>

<template>
  <span
    class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
    :class="TONES[tone]"
  >
    <slot />
  </span>
</template>
