<!-- 通用按钮组件 -->
<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    :type="type"
    :style="buttonStyle"
    @click="handleClick"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'clear';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  width?: string | number;
  height?: string | number;
}

interface Emits {
  (e: 'click'): void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  type: 'button',
  width: undefined,
  height: undefined,
});

const emit = defineEmits<Emits>();

const buttonClass = computed(() => {
  return [
    'btn',
    `btn-${props.variant}`,
    `btn-${props.size}`,
    {
      'btn-loading': props.loading,
      'btn-disabled': props.disabled,
    },
  ];
});

const buttonStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.width !== undefined) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }

  if (props.height !== undefined) {
    style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }

  return style;
});

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit('click');
  }
};
</script>

<style scoped>
.btn {
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-sizing: border-box;
  flex-shrink: 0;
}

/* 尺寸变体 */
.btn-small {
  padding: 8px 16px;
  font-size: 12px;
}

.btn-medium {
  padding: 12px 24px;
  font-size: 14px;
}

.btn-large {
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
}

/* 主要按钮 - 青色渐变 */
.btn-primary {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
}

.btn-primary:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.btn-primary:active:not(.btn-disabled) {
  transform: translateY(0);
}

/* 次要按钮 - 灰色渐变 */
.btn-secondary {
  background: linear-gradient(135deg, #666, #555);
  color: #fff;
}

.btn-secondary:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(135deg, #777, #666);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(102, 102, 102, 0.3);
}

.btn-secondary:active:not(.btn-disabled) {
  transform: translateY(0);
}

/* 危险按钮 - 红色渐变 */
.btn-danger {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: #fff;
}

.btn-danger:hover:not(.btn-disabled):not(.btn-loading) {
  background: linear-gradient(135deg, #e53935, #c62828);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(244, 67, 54, 0.3);
}

.btn-danger:active:not(.btn-disabled) {
  transform: translateY(0);
}

/* 清空按钮 - 浅灰色 */
.btn-clear {
  background: transparent;
  color: #ccc;
  border: 1px solid #555;
}

.btn-clear:hover:not(.btn-disabled):not(.btn-loading) {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.btn-clear:active:not(.btn-disabled) {
  transform: translateY(0);
}

/* 禁用状态 */
.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* 加载状态 */
.btn-loading {
  cursor: wait;
  transform: none !important;
  box-shadow: none !important;
}

.btn-primary.btn-loading {
  background: linear-gradient(135deg, #0097a7, #00695f);
}

.btn-secondary.btn-loading {
  background: linear-gradient(135deg, #555, #444);
}

.btn-danger.btn-loading {
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
}

.btn-clear.btn-loading {
  background: linear-gradient(135deg, #e0e0e0, #d0d0d0);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .btn-large {
    padding: 12px 24px;
    font-size: 14px;
  }

  .btn-medium {
    padding: 10px 20px;
    font-size: 13px;
  }

  .btn-small {
    padding: 6px 12px;
    font-size: 11px;
  }
}
</style>
