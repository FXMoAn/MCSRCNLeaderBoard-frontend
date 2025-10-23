<template>
  <div class="ranked-card">
    <div class="ranked-card-header">
      <div class="ranked-card-title">Ranked 数据</div>
      <PrimarySelect v-model="type" :options="rangeOptions" @change="handleTypeChange" />
    </div>

    <div class="ranked-card-content" v-if="!isLoading && rankedStats">
      <div class="ranked-stats-grid">
        <div class="ranked-stat-item">
          <span class="stat-label">ELO</span>
          <div class="stat-values">
            <span class="stat-count">{{ rankedStats.eloRate }} (#{{ rankedStats.eloRank }})</span>
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">赛季PB</span>
          <div class="stat-values">
            <span class="stat-count">{{
              formatTime(rankedStats.statistics[type].bestTime.ranked)
            }}</span>
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">胜负比</span>
          <div class="stat-values">
            <span class="stat-count"
              >{{ rankedStats.statistics[type].wins.ranked }}/{{
                rankedStats.statistics[type].loses.ranked
              }}</span
            >
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">弃权率</span>
          <div class="stat-values">
            <span class="stat-count">{{ forfeitRate }}%</span>
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">赛季Avg</span>
          <div class="stat-values">
            <span class="stat-count">{{ averageCompletionTime }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="ranked-card-content" v-else-if="isLoading">
      <Loading />
    </div>

    <div class="ranked-card-content" v-else>
      <div class="no-data">
        <p>暂无 Ranked 数据</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRankedStore, type RankedUserData } from '@/stores/ranked';
import { ref, watch, onMounted, computed } from 'vue';
import Loading from '@/components/common/Loading.vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';

interface Props {
  ingamename: string;
}

const props = defineProps<Props>();

const rankedStore = useRankedStore();
const rankedStats = ref<RankedUserData | null>(null);
const isLoading = ref(false);

// 格式化时间戳为mm:ss格式
const formatTime = (timestamp: number): string => {
  if (!timestamp || timestamp === 0) return '--:--';

  const totalSeconds = Math.floor(timestamp / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// 计算弃权率
const forfeitRate = computed(() => {
  if (!rankedStats.value) return '0.00';

  const { forfeits, playedMatches } = rankedStats.value.statistics[type.value];
  if (playedMatches.ranked === 0) return '0.00';

  const rate = (forfeits.ranked / playedMatches.ranked) * 100;
  return rate.toFixed(2);
});

// 计算赛季平均完成时间
const averageCompletionTime = computed(() => {
  if (!rankedStats.value) return '--:--';

  const { completions, completionTime } = rankedStats.value.statistics[type.value];
  if (completions.ranked === 0) return '--:--';

  const averageTime = completionTime.ranked / completions.ranked;
  return formatTime(averageTime);
});

const type = ref<'season' | 'total'>('season');

const rangeOptions = ref<{ value: 'season' | 'total'; label: string }[]>([
  { value: 'season', label: 'season' },
  { value: 'total', label: 'total' },
]);

const handleTypeChange = (value: string) => {
  type.value = value as 'season' | 'total';
};

const fetchStats = async () => {
  if (!props.ingamename) return;

  isLoading.value = true;
  try {
    const stats = await rankedStore.fetchRankedStats(props.ingamename);
    rankedStats.value = stats;
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.ingamename,
  () => {
    fetchStats();
  }
);

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.ranked-card {
  width: 100%;
  background-color: #333;
  border-radius: 8px;
  border: 1px solid #555;
  overflow: hidden;
}

.ranked-card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #555;
  background: linear-gradient(135deg, #444, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ranked-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #00bcd4;
}

.ranked-card-content {
  padding: 20px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ranked-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
}

.ranked-stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background-color: #444;
  border-radius: 6px;
  border: 1px solid #555;
  transition: all 0.2s ease;
}

.ranked-stat-item:hover {
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
  .ranked-stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .ranked-card-content {
    padding: 16px;
  }

  .ranked-stat-item {
    padding: 10px 12px;
  }
}
</style>
