<template>
  <select class="primary-select" :value="modelValue" @change="handleChange">
    <option v-for="option in options" :value="option.value" :key="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | null;
  options: { value: string; label: string }[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}>();

const handleChange = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLSelectElement).value);
  emit('change', (e.target as HTMLSelectElement).value);
};
</script>

<style scoped>
.primary-select {
  appearance: none;
  padding: 10px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.primary-select:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}
</style>
