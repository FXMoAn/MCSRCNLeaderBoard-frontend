<template>
  <ElTooltip v-model:visible="open" :content="text" :trigger="['hover', 'focus']" placement="top">
    <button
      type="button"
      class="info-hint"
      :aria-label="text"
      :aria-expanded="open"
      @click="open = true"
      @keydown.esc="open = false"
    >
      <InfoFilled aria-hidden="true" />
    </button>
  </ElTooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElTooltip } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
defineProps<{ text: string }>();
const open = ref(false);
</script>

<style scoped>
.info-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.info-hint svg {
  width: 15px;
  height: 15px;
  color: var(--text-muted);
}
.info-hint :deep(svg *) {
  color: inherit;
}
.info-hint:hover svg {
  color: var(--accent-bright);
}
.info-hint:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
