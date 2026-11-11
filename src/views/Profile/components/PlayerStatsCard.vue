<template>
  <section class="player-stats-card" :aria-label="title" :aria-busy="loading">
    <div class="player-stats-header">
      <h2>{{ title }}</h2>
      <div class="player-stats-actions">
        <el-tooltip
          v-if="result?.data && result.stale"
          v-model:visible="freshnessOpen"
          :trigger="['hover', 'focus']"
          :content="freshnessMessage"
          placement="top"
        >
          <button
            class="freshness-info"
            type="button"
            :aria-label="freshnessMessage"
            :aria-expanded="freshnessOpen"
            @click="freshnessOpen = true"
            @keydown.esc="freshnessOpen = false"
          >
            <InfoFilled aria-hidden="true" />
          </button>
        </el-tooltip>
        <slot name="controls" />
        <el-tooltip content="刷新数据" placement="top">
          <PrimaryButton
            variant="clear"
            class="stats-refresh"
            :disabled="result?.status === 'unbound'"
            :loading="loading"
            :aria-label="`刷新${title}`"
            @click="$emit('retry')"
          >
            <RefreshRight aria-hidden="true" :class="{ spinning: loading }" />
          </PrimaryButton>
        </el-tooltip>
      </div>
    </div>
    <div class="player-stats-content">
      <slot v-if="result?.data" />
      <Loading v-else-if="loading" />
      <p v-else class="stats-empty" role="status">{{ emptyMessage }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { InfoFilled, RefreshRight } from '@element-plus/icons-vue';
import { ElTooltip } from 'element-plus';
import Loading from '@/components/common/Loading.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import type { StatsResult } from '../../../../shared/player-stats.ts';

const props = defineProps<{
  title: string;
  loading: boolean;
  result: StatsResult<unknown> | null;
}>();
defineEmits<{ retry: [] }>();
const freshnessOpen = ref(false);

const emptyMessage = computed(() => {
  if (props.result?.status === 'unbound') return '未绑定游戏账号';
  if (props.result?.status === 'not_found') return '暂无该玩家的数据';
  if (props.result?.error === 'rate_limited') return '请求较多，请稍后刷新';
  if (props.result?.error === 'timeout') return '加载超时，请点击刷新重试';
  return '暂时无法获取数据，请点击刷新重试';
});
const freshnessMessage = computed(() => {
  const time = props.result?.updatedAt;
  const formatted = time ? new Date(time).toLocaleString('zh-CN', { hour12: false }) : '';
  return `正在显示上次成功的数据${formatted ? `，更新于 ${formatted}` : ''}`;
});
</script>

<style scoped>
.player-stats-card {
  width: 100%;
  background: #333;
  border: 1px solid #555;
  border-radius: 8px;
  overflow: hidden;
}
.player-stats-header {
  min-height: 70px;
  padding: 16px 20px;
  box-sizing: border-box;
  border-bottom: 1px solid #555;
  background: linear-gradient(135deg, #444, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #4caf50;
  white-space: nowrap;
}
.player-stats-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.player-stats-content {
  min-height: 200px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stats-refresh {
  width: 36px;
  height: 36px;
  padding: 8px;
}
.stats-refresh svg {
  width: 18px;
  height: 18px;
}
.freshness-info {
  border: 0;
  background: transparent;
  color: #e6c56a;
  padding: 4px;
  width: 28px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.freshness-info:hover {
  color: #fff1bd;
}
.freshness-info:focus-visible,
.stats-refresh:focus-visible {
  outline: 2px solid #4caf50;
  outline-offset: 3px;
}
.stats-empty {
  margin: 0;
  color: #b5c2b9;
  font-size: 14px;
  text-align: center;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
@media (max-width: 768px) {
  .player-stats-header,
  .player-stats-content {
    padding: 16px;
  }
}
@media (max-width: 380px) {
  .player-stats-header {
    flex-wrap: wrap;
  }
  .player-stats-actions {
    margin-left: auto;
  }
}
</style>
