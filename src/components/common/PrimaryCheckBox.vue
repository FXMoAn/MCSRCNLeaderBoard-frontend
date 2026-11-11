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
  position: relative;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #f5f5f5;
  transition: color 0.2s ease;
}

.primary-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.primary-checkbox__input:focus-visible + .primary-checkbox__box {
  outline: 2px solid var(--accent-bright);
  outline-offset: 3px;
}

.primary-checkbox__box {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--border-light);
  background: var(--panel-raised);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.primary-checkbox__icon {
  width: 14px;
  height: 14px;
  stroke: #fff;
}

.primary-checkbox.is-checked .primary-checkbox__box {
  background: var(--accent-dark);
  border-color: var(--accent);
}

.primary-checkbox:hover:not(.is-disabled) .primary-checkbox__box {
  border-color: var(--accent);
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
@media (prefers-reduced-motion: reduce) {
  .primary-checkbox,
  .primary-checkbox__box {
    transition: none;
  }
}
</style>
