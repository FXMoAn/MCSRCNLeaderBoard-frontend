<template>
  <div class="paceman-card">
    <div class="paceman-card-header">
      <div class="paceman-card-title">Paceman 数据</div>
      <PrimarySelect v-model="range" :options="rangeOptions" @change="handleRangeChange" />
    </div>

    <div class="paceman-card-content" v-if="!isLoading && pacemanStats">
      <div class="paceman-stats-grid">
        <div class="paceman-stat-item">
          <span class="stat-label">下界</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.nether.count }}</span>
            <span class="stat-avg">{{ pacemanStats.nether.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">第一个结构</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.first_structure.count }}</span>
            <span class="stat-avg">{{ pacemanStats.first_structure.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">第二个结构</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.second_structure.count }}</span>
            <span class="stat-avg">{{ pacemanStats.second_structure.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">盲传</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.first_portal.count }}</span>
            <span class="stat-avg">{{ pacemanStats.first_portal.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">要塞</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.stronghold.count }}</span>
            <span class="stat-avg">{{ pacemanStats.stronghold.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">末地</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.end.count }}</span>
            <span class="stat-avg">{{ pacemanStats.end.avg }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">完成</span>
          <div class="stat-values">
            <span class="stat-count">{{ pacemanStats.finish.count }}</span>
            <span class="stat-avg">{{ pacemanStats.finish.avg }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="paceman-card-content" v-else-if="isLoading">
      <Loading />
    </div>

    <div class="paceman-card-content" v-else>
      <div class="no-data">
        <p>暂无 Paceman 数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePacemanStore, type PacemanStats } from '@/stores/paceman';
import { ref, watch, onMounted } from 'vue';
import Loading from '@/components/common/Loading.vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';

interface Props {
  ingamename: string;
}

const props = defineProps<Props>();

const pacemanStore = usePacemanStore();
const pacemanStats = ref<PacemanStats | null>(null);
const isLoading = ref(false);

const fetchStats = async (hours: number, hoursBetween: number) => {
  if (!props.ingamename) return;

  isLoading.value = true;
  try {
    const stats = await pacemanStore.fetchPacemanStats(props.ingamename, hours, hoursBetween);
    pacemanStats.value = stats;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.ingamename,
  () => {
    fetchStats(24, 2);
  }
);

// onMounted(() => {
//   fetchStats(24, 2);
// });

const range = ref<string>('session');
const rangeOptions = ref<{ value: string; label: string }[]>([
  { value: 'session', label: 'session' },
  { value: 'day', label: 'day' },
  { value: 'week', label: 'week' },
  { value: 'month', label: 'month' },
]);

const handleRangeChange = (value: string) => {
  range.value = value;
  switch (value) {
    case 'session':
      fetchStats(24, 2);
      break;
    case 'day':
      fetchStats(24, 24);
      break;
    case 'week':
      fetchStats(24 * 7, 24 * 7);
      break;
    case 'month':
      fetchStats(24 * 30, 24 * 30);
      break;
  }
};
</script>

<style scoped>
.paceman-card {
  width: 100%;
  background-color: #333;
  border-radius: 8px;
  border: 1px solid #555;
  overflow: hidden;
}

.paceman-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #555;
  background: linear-gradient(135deg, #444, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paceman-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #00bcd4;
}

.paceman-card-content {
  padding: 20px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.paceman-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
}

.paceman-stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background-color: #444;
  border-radius: 6px;
  border: 1px solid #555;
  transition: all 0.2s ease;
}

.paceman-stat-item:hover {
  background-color: #555;
  border-color: #666;
}

.stat-label {
  font-size: 14px;
  color: #ccc;
  font-weight: 500;
}

.stat-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-count {
  font-size: 18px;
  font-weight: 600;
  color: #00bcd4;
}

.stat-avg {
  font-size: 12px;
  color: #999;
}

.no-data {
  text-align: center;
  color: #999;
}

.no-data p {
  margin: 0;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .paceman-stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .paceman-card-content {
    padding: 16px;
  }

  .paceman-stat-item {
    padding: 10px 12px;
  }
}
</style>
