<script setup>
defineProps({ modelValue: Array, options: Object });
const emit = defineEmits(["update:modelValue"]);
function toggle(value, selected) {
  emit(
    "update:modelValue",
    selected.includes(value)
      ? selected.filter((x) => x !== value)
      : [...selected, value],
  );
}
</script>
<template>
  <div class="chips">
    <button
      v-for="(label, value) in options"
      :key="value"
      type="button"
      class="chip"
      :class="{ selected: modelValue.includes(value) }"
      :aria-pressed="modelValue.includes(value)"
      @click="toggle(value, modelValue)"
    >
      <span v-if="modelValue.includes(value)">✓ </span>{{ label }}
    </button>
  </div>
</template>
