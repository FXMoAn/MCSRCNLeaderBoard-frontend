<template>
  <PlayerStatsCard title="Ranked 数据" :result="result" :loading="isLoading" @retry="retry">
    <template #controls>
      <PrimarySelect v-model="type" :options="rangeOptions" aria-label="Ranked统计范围" />
    </template>
    <template v-if="stats">
      <div class="ranked-stats-grid">
        <div class="ranked-stat-item">
          <span class="stat-label">ELO</span>
          <div class="stat-values">
            <span class="stat-count"
              >{{ stats.eloRate ?? '--'
              }}<template v-if="stats.eloRank"> (#{{ stats.eloRank }})</template></span
            >
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">{{ type === 'season' ? '赛季PB' : '总计PB' }}</span>
          <div class="stat-values">
            <span class="stat-count">{{ formatTime(stats.statistics[type].bestTime.ranked) }}</span>
          </div>
        </div>

        <div class="ranked-stat-item">
          <span class="stat-label">胜负比</span>
          <div class="stat-values">
            <span class="stat-count"
              >{{ stats.statistics[type].wins.ranked }}/{{
                stats.statistics[type].loses.ranked
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
          <span class="stat-label">{{ type === 'season' ? '赛季Avg' : '总计Avg' }}</span>
          <div class="stat-values">
            <span class="stat-count">{{ averageCompletionTime }}</span>
          </div>
        </div>
      </div>
    </template>
  </PlayerStatsCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';
import { usePlayerStats } from '@/composables/usePlayerStats';
import PlayerStatsCard from './PlayerStatsCard.vue';

const props = defineProps<{ profileId: string | number; ingamename?: string | null }>();
const type = ref<'season' | 'total'>('season');
const rangeOptions = [
  { value: 'season', label: 'season' },
  { value: 'total', label: 'total' },
];
const {
  result,
  data: stats,
  isLoading,
  retry,
} = usePlayerStats(() => ({
  provider: 'ranked',
  profileId: props.profileId,
  ingamename: props.ingamename,
}));

const formatTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '--:--';
  const totalSeconds = Math.floor(timestamp / 1000);
  return `${Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
};
const forfeitRate = computed(() => {
  const current = stats.value?.statistics[type.value];
  return current?.playedMatches.ranked
    ? ((current.forfeits.ranked / current.playedMatches.ranked) * 100).toFixed(2)
    : '0.00';
});
const averageCompletionTime = computed(() => {
  const current = stats.value?.statistics[type.value];
  return current?.completions.ranked
    ? formatTime(current.completionTime.ranked / current.completions.ranked)
    : '--:--';
});
</script>

<style scoped>
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
  color: #4caf50;
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
