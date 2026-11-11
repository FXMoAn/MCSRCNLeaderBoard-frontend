<template>
  <PlayerStatsCard title="Paceman 数据" :result="result" :loading="isLoading" @retry="retry">
    <template #controls>
      <PrimarySelect v-model="range" :options="rangeOptions" aria-label="Paceman统计范围" />
    </template>
    <template v-if="stats">
      <div class="paceman-stats-grid">
        <div class="paceman-stat-item">
          <span class="stat-label">下界</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.nether.avg }}</span>
            <span class="stat-count">{{ stats.nether.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">第一个结构</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.first_structure.avg }}</span>
            <span class="stat-count">{{ stats.first_structure.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">第二个结构</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.second_structure.avg }}</span>
            <span class="stat-count">{{ stats.second_structure.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">盲传</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.first_portal.avg }}</span>
            <span class="stat-count">{{ stats.first_portal.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">要塞</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.stronghold.avg }}</span>
            <span class="stat-count">{{ stats.stronghold.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">末地</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.end.avg }}</span>
            <span class="stat-count">{{ stats.end.count }}</span>
          </div>
        </div>

        <div class="paceman-stat-item">
          <span class="stat-label">完成</span>
          <div class="stat-values">
            <span class="stat-avg">{{ stats.finish.avg }}</span>
            <span class="stat-count">{{ stats.finish.count }}</span>
          </div>
        </div>
      </div>
    </template>
  </PlayerStatsCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PrimarySelect from '@/components/common/PrimarySelect.vue';
import { usePlayerStats } from '@/composables/usePlayerStats';
import type { PacemanRange } from '../../../../shared/player-stats.ts';
import PlayerStatsCard from './PlayerStatsCard.vue';

const props = defineProps<{ profileId: string | number; ingamename?: string | null }>();
const range = ref<PacemanRange>('session');
const rangeOptions = [
  { value: 'session', label: 'session' },
  { value: 'day', label: 'day' },
  { value: 'week', label: 'week' },
  { value: 'month', label: 'month' },
];
const {
  result,
  data: stats,
  isLoading,
  retry,
} = usePlayerStats(() => ({
  provider: 'paceman',
  profileId: props.profileId,
  ingamename: props.ingamename,
  range: range.value,
}));
</script>

<style scoped>
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
  font-size: 16px;
  color: #999;
}

.stat-avg {
  font-size: 18px;
  font-weight: 600;
  color: #4caf50;
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
