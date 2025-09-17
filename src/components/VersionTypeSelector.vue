<template>
  <div class="version-type-selector">
    <div class="filter-group">
      <label class="filter-label">版本筛选</label>
      <select v-model="version" class="filter-select" @change="confirmFilter">
        <option value="1.16.1">1.16-1.19</option>
        <option value="1.20">1.20+</option>
        <option value="1.15.2">1.13-1.15</option>
        <option value="1.12.2">1.9-1.12</option>
        <option value="1.8.9">1.8</option>
        <option value="1.7.10">pre 1.8</option>
      </select>
    </div>
    <div class="filter-group">
      <label class="filter-label">类型筛选</label>
      <select v-model="type" class="filter-select" @change="confirmFilter">
        <option value="RSG">RSG</option>
        <option value="SSG">SSG</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  initialVersion: string;
  initialType: string;
}

interface Emits {
  (e: 'confirmFilter', version: string, type: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialVersion: '1.16.1',
  initialType: 'RSG',
});

const version = ref(props.initialVersion);
const type = ref(props.initialType);

const emit = defineEmits<Emits>();

// 监听props变化，确保组件能正确显示最新的值
watch(
  () => props.initialVersion,
  (newVersion) => {
    version.value = newVersion;
  }
);

watch(
  () => props.initialType,
  (newType) => {
    type.value = newType;
  }
);

const confirmFilter = () => {
  emit('confirmFilter', version.value, type.value);
};
</script>

<style scoped>
.version-type-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  gap: 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid #444;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 150px;
}

.filter-label {
  color: #ccc;
  font-size: 0.85em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-select,
.filter-input {
  padding: 10px 12px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  min-width: 120px;
}

.filter-input::placeholder {
  color: #666;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}
</style>
