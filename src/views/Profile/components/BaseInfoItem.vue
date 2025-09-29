<template>
  <div class="base-info-item" v-show="value">
    <span class="base-info-item-label">{{ label }}</span>
    <span class="base-info-item-value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  value: string;
}

const props = defineProps<Props>();
</script>

<style scoped>
.base-info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
