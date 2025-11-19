<template>
  <section class="stats-page-container">
    <PrimarySelect v-model="chartType" :options="versionOptions" @change="handleChartTypeChange" />
    <RecordHistory v-if="chartType === 'record'" />
    <CountByTime v-if="chartType === 'count'" />
  </section>
</template>

<script setup>
import RecordHistory from './components/RecordHistory.vue';
import CountByTime from './components/CountByTIme.vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';
import { ref } from 'vue';

const chartType = ref('record');
const versionOptions = [
  { value: 'record', label: '记录变迁史' },
  { value: 'count', label: '记录按时间分布图' },
];

const handleChartTypeChange = (value) => {
  chartType.value = value;
};
</script>

<style scoped>
.stats-page-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0 100px 0;
  background-color: var(--bgcolor);
  min-height: calc(100vh - 80px);
}

.title {
  font-size: 1.8em;
  font-weight: 600;
  margin-bottom: 30px;
  color: #fff;
  text-align: center;
}
</style>
