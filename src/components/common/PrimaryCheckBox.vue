<template>
  <label
    class="primary-checkbox"
    :class="{
      'is-disabled': disabled,
      'is-checked': modelValue,
    }"
  >
    <input
      class="primary-checkbox__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="toggle"
    />
    <span class="primary-checkbox__box" aria-hidden="true">
      <svg
        v-if="modelValue"
        class="primary-checkbox__icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 13L9 17L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="primary-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean;
  label?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  label: '',
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'change', value: boolean): void;
}>();

const toggle = (event: Event) => {
  if (props.disabled) {
    return;
  }

  const target = event.target as HTMLInputElement;
  const nextValue = target.checked;

  emit('update:modelValue', nextValue);
  emit('change', nextValue);
};
</script>

<style scoped>
.primary-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #f5f5f5;
  transition: color 0.2s ease;
}

.primary-checkbox__input {
  display: none;
}

.primary-checkbox__box {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.primary-checkbox__icon {
  width: 14px;
  height: 14px;
  stroke: #fff;
}

.primary-checkbox.is-checked .primary-checkbox__box {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  border-color: transparent;
  box-shadow: 0 6px 20px rgba(0, 188, 212, 0.35);
}

.primary-checkbox:hover:not(.is-disabled) .primary-checkbox__box {
  transform: translateY(-1px) scale(1.02);
}

.primary-checkbox__label {
  line-height: 1.4;
}

.primary-checkbox.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-checkbox.is-disabled .primary-checkbox__box {
  box-shadow: none;
}
</style>
