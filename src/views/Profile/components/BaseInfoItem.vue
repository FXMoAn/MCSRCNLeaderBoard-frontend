<template>
  <div class="base-info-item" v-show="value">
    <div class="info-label">
      <span class="label-text">{{ label }}</span>
    </div>
    <div class="info-value">
      <span v-if="isUrl" class="value-link" @click="openLink">{{ displayValue }}</span>
      <span v-else class="value-text">{{ displayValue }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  label: string;
  value: string | null;
}

const props = defineProps<Props>();

const isUrl = computed(() => {
  if (!props.value) return false;
  return props.value.startsWith('http://') || props.value.startsWith('https://');
});

const displayValue = computed(() => {
  if (!props.value) return '';
  // 如果是URL，显示简化的文本
  if (isUrl.value) {
    try {
      const url = new URL(props.value);
      return url.hostname + (url.pathname !== '/' ? url.pathname : '');
    } catch {
      return props.value;
    }
  }
  return props.value;
});

const openLink = () => {
  if (props.value) {
    window.open(props.value, '_blank', 'noopener,noreferrer');
  }
};
</script>

<style scoped>
.base-info-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.base-info-item:last-child {
  border-bottom: none;
}

.info-label {
  min-width: 80px;
  flex-shrink: 0;
}

.label-text {
  font-size: 14px;
  color: #ccc;
  font-weight: 500;
}

.info-value {
  flex: 1;
  min-width: 0;
}

.value-text {
  font-size: 14px;
  color: #fff;
  word-break: break-all;
}

.value-link {
  font-size: 14px;
  color: #00bcd4;
  cursor: pointer;
  text-decoration: none;
  word-break: break-all;
  transition: all 0.2s ease;
  display: inline-block;
  padding: 2px 4px;
  border-radius: 4px;
}

.value-link:hover {
  color: #00acc1;
  background-color: rgba(0, 188, 212, 0.1);
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .base-info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 0;
  }

  .info-label {
    min-width: auto;
  }

  .label-text {
    font-size: 13px;
  }

  .value-text,
  .value-link {
    font-size: 13px;
  }
}
</style>
