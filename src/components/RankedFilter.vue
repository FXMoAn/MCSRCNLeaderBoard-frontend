<template>
  <div class="ranked-filter">
    <div class="filter-group">
      <label class="filter-label">IGT筛选</label>
      <select v-model="igt" class="filter-select" @change="confirmFilter">
        <option value="0,99" selected>全部</option>
        <option value="0,10">0-10min</option>
        <option value="10,13">10-13min</option>
        <option value="13,15">13-15min</option>
        <option value="15,20">15-20min</option>
        <option value="20,99">20min+</option>
      </select>
    </div>

    <div class="filter-group">
      <label class="filter-label">用户名</label>
      <input
        type="text"
        v-model="nickname"
        class="filter-input"
        placeholder="输入用户名筛选"
        @keydown.enter="confirmFilter"
      />
    </div>

    <div class="filter-actions">
      <PrimaryButton @click="confirmFilter" variant="primary">确定</PrimaryButton>
      <PrimaryButton @click="clearFilter" variant="clear">清空</PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';

interface Props {
  initialIgt?: string;
  initialNickname?: string;
}

interface Emits {
  (e: 'confirmFilter', filter: { igt: string; nickname: string }): void;
}

const props = withDefaults(defineProps<Props>(), {
  initialIgt: '0,99',
  initialNickname: '',
});

const emit = defineEmits<Emits>();

// 使用props初始化本地状态
const nickname = ref(props.initialNickname);
const igt = ref(props.initialIgt);

// 监听props变化，同步本地状态
watch(
  () => props.initialIgt,
  (newVal) => {
    igt.value = newVal;
  },
  { immediate: true }
);

watch(
  () => props.initialNickname,
  (newVal) => {
    nickname.value = newVal;
  },
  { immediate: true }
);

const clearFilter = () => {
  igt.value = '0,99';
  nickname.value = '';
  emit('confirmFilter', {
    igt: igt.value,
    nickname: nickname.value,
  });
};

const confirmFilter = () => {
  emit('confirmFilter', {
    igt: igt.value,
    nickname: nickname.value,
  });
};
</script>

<style scoped>
.ranked-filter {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
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

@media (max-width: 768px) {
  .ranked-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;
  }

  .filter-group {
    min-width: auto;
  }

  .filter-actions {
    margin-left: 0;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .ranked-filter {
    padding: 12px;
    gap: 12px;
  }
}
</style>
