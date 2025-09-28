<template>
  <input
    :type="type"
    class="primary-input"
    :placeholder="placeholder"
    v-model="value"
    :disabled="disabled"
    @input="handleInput"
    @focus="handleFocus"
    @blur="handleBlur"
    @change="handleChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  placeholder?: string;
  type?: string;
  modelValue?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  modelValue: '',
  type: 'text',
  disabled: false,
});

const value = computed({
  get: () => props.modelValue ?? '',
  set: (val: string) => emit('update:modelValue', val),
});

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'focus', evt: FocusEvent): void;
  (e: 'blur', evt: FocusEvent): void;
  (e: 'input', evt: Event): void;
  (e: 'change', evt: Event): void;
}

const emit = defineEmits<Emits>();

const handleInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
};

const handleFocus = (e: FocusEvent) => {
  emit('focus', e);
};

const handleBlur = (e: FocusEvent) => {
  emit('blur', e);
};

const handleChange = (e: Event) => {
  emit('change', e);
};
</script>

<style scoped>
.primary-input {
  flex: 1;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.primary-input::placeholder {
  color: #666;
}

.primary-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}
</style>
