<template>
  <div v-if="isLoading" class="verify-container">
    <Loading />
  </div>
  <div v-else-if="verifyData.length > 0" class="verify-container">
    <RunCard
      v-for="item in verifyData"
      :key="item.run_id"
      :id="item.run_id"
      :nickname="item.nickname"
      :igt="item.igt"
      :videolink="item.videolink"
      :version="item.version"
      :type="item.type"
      :date="item.date"
      :status="item.status"
    />
  </div>
  <div v-else class="verify-container">
    <p class="tip-text">暂无待审核成绩</p>
  </div>
</template>

<script setup lang="ts">
import RunCard from '../components/RunCard.vue';
import Loading from '@/components/common/Loading.vue';
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

.tip-text {
  color: #fff;
  font-size: 1.2em;
  text-align: center;
}
</style>
