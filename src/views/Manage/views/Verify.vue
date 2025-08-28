<template>
  <div v-if="isLoading" class="verify-container">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
  </div>
  <div v-else-if="verifyData.length > 0" class="verify-container">
    <RunCard
      v-for="item in verifyData"
      :key="item.run_id"
      :id="item.run_id"
      :nickname="item.nickname"
      :igt="item.igt"
      :videolink="item.videolink"
    />
  </div>
  <div v-else class="verify-container">
    <p class="loading-text">暂无待审核成绩</p>
  </div>
</template>

<script setup lang="ts">
import RunCard from '../components/RunCard.vue';
import { ref, onMounted, computed } from 'vue';
import { useStatsStore } from '@/stores/stats';

const statsStore = useStatsStore();

const verifyData = ref<any[]>([]);
const isLoading = computed(() => statsStore.isLoading);

onMounted(() => {
  statsStore.getPendingRuns().then((data) => {
    verifyData.value = data;
  });
});
</script>

<style scoped>
.verify-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 100px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00bcd4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
