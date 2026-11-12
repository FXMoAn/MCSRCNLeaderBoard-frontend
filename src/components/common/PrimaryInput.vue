<template>
  <div class="primary-input-container" :class="{ 'primary-input-stacked': layout === 'stacked' }">
    <label class="primary-input-label" v-show="label" :for="inputId">{{ label }}</label>
    <div
      class="primary-input-control"
      :class="{ 'has-password-toggle': passwordToggle && type === 'password' }"
    >
      <input
        :type="type === 'password' && revealed ? 'text' : type"
        :id="inputId"
        :autocomplete="autocomplete"
        :maxlength="maxLength"
        :name="name"
        :minlength="minLength"
        :inputmode="inputMode"
        :spellcheck="type === 'password' || type === 'email' ? false : undefined"
        :autocapitalize="type === 'email' || type === 'password' ? 'off' : undefined"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="primary-input"
        :placeholder="placeholder"
        :value="value"
        :disabled="disabled"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @change="handleChange"
      />
      <button
        v-if="passwordToggle && type === 'password'"
        type="button"
        class="password-toggle"
        :aria-label="revealed ? '隐藏密码' : '显示密码'"
        :title="revealed ? '隐藏密码' : '显示密码'"
        :aria-controls="inputId"
        :aria-pressed="revealed"
        :disabled="disabled"
        @click="revealed = !revealed"
      >
        <HideIcon v-if="revealed" aria-hidden="true" /><ViewIcon v-else aria-hidden="true" />
      </button>
    </div>
    <span v-if="error" :id="`${inputId}-error`" class="primary-input-error" role="alert">{{
      error
    }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * 通用输入框组件
 * @param placeholder 占位符
 * @param type 类型
 * @param modelValue 模型值
 * @param disabled 是否禁用
 */
import { computed, ref, useId } from 'vue';
import { View as ViewIcon, Hide as HideIcon } from '@element-plus/icons-vue';

interface Props {
  label?: string;
  placeholder?: string;
  type?: string;
  modelValue?: string | null;
  disabled?: boolean;
  id?: string;
  layout?: 'inline' | 'stacked';
  autocomplete?: string;
  maxLength?: number;
  error?: string;
  name?: string;
  minLength?: number;
  inputMode?: 'email' | 'text' | 'numeric' | 'url' | 'search' | 'tel' | 'decimal';
  passwordToggle?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  modelValue: '',
  type: 'text',
  disabled: false,
  layout: 'inline',
});

const revealed = ref(false);
const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);

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
  emit('input', e);
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
.primary-input-control {
  flex: 1;
  min-width: 0;
  display: flex;
  position: relative;
}
.has-password-toggle .primary-input {
  padding-inline-end: 48px;
}
.password-toggle {
  position: absolute;
  inset-inline-end: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.password-toggle svg {
  width: 18px;
  height: 18px;
}
.password-toggle:hover:not(:disabled) {
  background: var(--hovercolor);
}
.password-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
.password-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary-input-label {
  color: #ccc;
  font-size: 1em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.primary-input {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.primary-input-stacked {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.primary-input-stacked .primary-input-label {
  font-size: 14px;
  line-height: 20px;
  letter-spacing: normal;
  text-transform: none;
  color: var(--text-secondary);
}
.primary-input-stacked .primary-input {
  width: 100%;
  min-height: 44px;
  line-height: 18px;
  background: var(--bgcolor);
  border-color: var(--border-light);
}
.primary-input:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.primary-input[aria-invalid='true'] {
  border-color: var(--danger);
}
.primary-input-error {
  font-size: 13px;
  color: #ffb4ab;
  line-height: 1.5;
}

.primary-input::placeholder {
  color: #666;
}

.primary-input:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}
.primary-input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px var(--bgcolor, #202720) inset;
  -webkit-text-fill-color: var(--text-primary, #fff);
  caret-color: var(--text-primary, #fff);
}
</style>
