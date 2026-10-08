<template>
  <button class="year-comparison-btn" @click="navToYearComparison">
    <div class="btn-content">
      <span class="btn-icon">📊</span>
      <span class="btn-text">
        <span class="btn-line">点击查看</span>
        <span class="btn-line">2025年</span>
        <span class="btn-line">榜单变更</span>
      </span>
    </div>
    <div class="btn-glow"></div>
  </button>
  <div class="control-container">
    <VersionTypeSelector
      @confirmFilter="handleSelectionChange"
      :initialVersion="state.version"
      :initialType="state.type"
    />

    <RankedFilter
      @confirmFilter="handleConfirmFilter"
      :initialIgt="state.igt"
      :initialNickname="state.nickname"
    />

    <OtherFilter @confirmFilter="handleOtherConfirmFilter" :initialIsNewRecord="state.newRecord" />
  </div>
  <div class="content-container">
    <div class="results-toolbar">
      <div class="refresh-status" role="status" aria-live="polite">
        <span v-if="isLoading">{{ statsdata.length ? '正在更新榜单…' : '正在加载榜单…' }}</span>
        <span v-else-if="loadError" class="refresh-error">{{ loadError }}</span>
        <span v-else-if="updatedTime">更新于 {{ updatedTime }}</span>
      </div>
      <PrimaryButton
        variant="clear"
        size="small"
        class="refresh-button"
        :loading="isLoading"
        @click="handleRefresh"
      >
        {{ isLoading ? '刷新中…' : '刷新榜单' }}
      </PrimaryButton>
    </div>
    <Loading v-if="isLoading && statsdata.length === 0" />
    <div class="container" v-else :aria-busy="isLoading">
      <div class="leaderboard" :class="{ 'is-empty': filteredData.length === 0 }">
        <div class="leaderboard-head">
          <div class="rank-cell">排名</div>
          <div class="player-cell">玩家</div>
          <div class="igt-cell">IGT</div>
          <div class="date-cell">记录时间</div>
          <div class="video-cell">记录视频</div>
        </div>
        <div class="leaderboard-body">
          <div v-if="filteredData.length === 0" class="empty-state" role="status">
            <strong>{{
              loadError
                ? '榜单加载失败'
                : hasActiveFilters
                  ? '没有符合条件的成绩'
                  : '该分类暂无成绩'
            }}</strong>
            <p>
              {{
                loadError
                  ? '请点击上方“刷新榜单”重试。'
                  : hasActiveFilters
                    ? '试试调整用户名、IGT 或新纪录筛选。'
                    : '可以切换版本或类型查看其他榜单。'
              }}
            </p>
          </div>
          <RankCard
            v-for="info in slicedata"
            :key="info.run_id"
            :rank="info.rank"
            :nickname="info.nickname"
            :userId="Number(info.userid)"
            :igt="info.igt"
            :date="info.date"
            :videolink="info.videolink"
            :runId="info.run_id"
            :is_new_record="info.is_new_record"
            @click="navToRunDetail"
            @video-click="openVideo"
          />
        </div>
      </div>
    </div>
    <Pagination
      :currentPage="state.page"
      :pageSize="state.pageSize"
      :totalPages="pages"
      :totalItems="filteredData.length"
      :disabled="isLoading || !hasLoaded"
      @update:currentPage="handlePageChange"
      @update:pageSize="handlePageSizeChange"
    />
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { LEADERBOARD_CACHE_TTL, useStatsStore } from '@/stores/stats.ts';
import { createURLStateManager } from '@/utils/urlStateManage';
import { showErrorNotification } from '@/utils/notification';
import { DEFAULT_PAGE_SIZE, normalizePage, normalizePageSize } from '@/constants/pagination';
import { useRouter, useRoute } from 'vue-router';
import RankedFilter from '@/components/RankedFilter.vue';
import Pagination from '@/components/Pagination.vue';
import VersionTypeSelector from '@/components/VersionTypeSelector.vue';
import Loading from '@/components/common/Loading.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import RankCard from './components/RankCard.vue';
import OtherFilter from '@/components/OtherFilter.vue';

interface RankState {
  version: string;
  type: string;
  igt: string;
  nickname: string;
  newRecord: boolean;
  page: number;
  pageSize: number;
}

const stateManager = createURLStateManager<RankState>({
  defaultState: {
    version: '1.16.1',
    type: 'RSG',
    igt: '0,99',
    nickname: '',
    newRecord: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  },
  urlFields: ['version', 'type', 'igt', 'nickname', 'newRecord', 'page', 'pageSize'],
  transformers: {
    page: { toUrl: String, fromUrl: normalizePage },
    pageSize: { toUrl: String, fromUrl: normalizePageSize },
  },
  storageKey: 'rank_state',
  storage: 'memory',
});

const router = useRouter();
const route = useRoute();
const statsStore = useStatsStore();
const restoredState = stateManager.initialize();
const state = stateManager.getState();
stateManager.setMultiple(
  {
    page: normalizePage(restoredState.page),
    pageSize: normalizePageSize(restoredState.pageSize),
    newRecord: restoredState.newRecord === true,
    nickname: typeof restoredState.nickname === 'string' ? restoredState.nickname : '',
    igt: typeof restoredState.igt === 'string' ? restoredState.igt : '0,99',
  },
  false
);

const hasLoaded = ref(false);
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const loadError = computed(() => statsStore.loadError);
const updatedTime = computed(() => {
  if (typeof statsStore.lastUpdatedAt !== 'number') return '';
  return new Date(statsStore.lastUpdatedAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
});
const hasActiveFilters = computed(
  () => state.value.igt !== '0,99' || state.value.nickname !== '' || state.value.newRecord
);
const filteredData = computed(() => {
  const { igt, nickname, newRecord } = state.value;
  const [min, max] = igt.split(',').map(Number);
  const query = nickname.toLowerCase();
  return statsdata.value.filter((run) => {
    const minutes = Number(run.igt.split(':')[0]);
    return (
      (igt === '0,99' || (minutes >= min && minutes < max)) &&
      run.nickname.toLowerCase().includes(query) &&
      (!newRecord || run.is_new_record)
    );
  });
});
const pages = computed(() =>
  Math.max(1, Math.ceil(filteredData.value.length / state.value.pageSize))
);
const slicedata = computed(() => {
  const start = (state.value.page - 1) * state.value.pageSize;
  return filteredData.value.slice(start, start + state.value.pageSize);
});

const saveState = (updates: Partial<RankState>) => {
  stateManager.setMultiple(updates);
  stateManager.saveToStorage();
};

const handleSelectionChange = async (version: string, type: string) => {
  saveState({ version, type, page: 1, newRecord: false });
  await statsStore.getStats(version, type);
};

const handleRefresh = () => statsStore.refreshStats(state.value.version, state.value.type);
const refreshIfStale = (allowRetry = false) => {
  if (!hasLoaded.value || document.hidden || !navigator.onLine || isLoading.value) return;
  // A failed background request waits for a manual refresh or a return to the page.
  if (loadError.value && !allowRetry) return;
  if (
    statsStore.lastUpdatedAt === null ||
    Date.now() - statsStore.lastUpdatedAt >= LEADERBOARD_CACHE_TTL
  ) {
    void statsStore.getStats(state.value.version, state.value.type, 'verified', { silent: true });
  }
};
const handlePageReturn = () => refreshIfStale(true);
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let disposed = false;

const handlePageChange = (page: number) => {
  saveState({ page: Math.min(pages.value, normalizePage(page)) });
};
const handlePageSizeChange = (pageSize: number) => {
  saveState({ pageSize: normalizePageSize(pageSize), page: 1 });
};
const handleConfirmFilter = (filter: { igt: string; nickname: string }) => {
  const changed = filter.igt !== state.value.igt || filter.nickname !== state.value.nickname;
  saveState({ ...filter, ...(changed ? { page: 1 } : {}) });
};
const handleOtherConfirmFilter = (value: boolean) => {
  saveState({ newRecord: value, page: 1 });
};

const navToRunDetail = (id: number) => router.push(`/run/${id}`);
const navToYearComparison = () => router.push('/24to25');
const openVideo = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

onMounted(async () => {
  window.addEventListener('focus', handlePageReturn);
  window.addEventListener('online', handlePageReturn);
  document.addEventListener('visibilitychange', handlePageReturn);
  refreshTimer = setInterval(refreshIfStale, LEADERBOARD_CACHE_TTL);
  await statsStore.getStats(state.value.version, state.value.type);
  if (disposed) return;
  hasLoaded.value = true;
  const page = Math.min(pages.value, normalizePage(state.value.page));
  saveState({ page });
  if (route.query.error === 'unauthorized') {
    showErrorNotification('您没有权限访问该页面，需要管理员权限');
    const { error, ...query } = route.query;
    router.replace({ query });
  }
});

onUnmounted(() => {
  disposed = true;
  clearInterval(refreshTimer);
  window.removeEventListener('focus', handlePageReturn);
  window.removeEventListener('online', handlePageReturn);
  document.removeEventListener('visibilitychange', handlePageReturn);
});

watch([pages, isLoading], () => {
  if (hasLoaded.value && !isLoading.value && state.value.page > pages.value) {
    saveState({ page: pages.value });
  }
});
</script>

<style scoped>
.year-comparison-btn {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.btn-content {
  position: relative;
  padding: 16px 12px;
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.95), rgba(0, 151, 167, 0.95));
  border: 2px solid rgba(0, 188, 212, 0.6);
  border-radius: 12px;
  box-shadow:
    0 4px 20px rgba(0, 188, 212, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 70px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
}

.btn-icon {
  font-size: 24px;
  line-height: 1;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.btn-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
  letter-spacing: 0.5px;
}

.btn-line {
  display: block;
  white-space: nowrap;
}

.btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(0, 188, 212, 0.3) 0%, transparent 70%);
  border-radius: 12px;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
  z-index: -1;
}

.year-comparison-btn:hover .btn-content {
  background: linear-gradient(135deg, rgba(0, 188, 212, 1), rgba(0, 151, 167, 1));
  transform: translateX(8px) scale(1.05);
  box-shadow:
    0 8px 30px rgba(0, 188, 212, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  border-color: rgba(0, 188, 212, 0.9);
}

.year-comparison-btn:hover .btn-glow {
  opacity: 1;
}

.year-comparison-btn:hover .btn-icon {
  animation:
    float 1.5s ease-in-out infinite,
    pulse 2s ease-in-out infinite;
}

.year-comparison-btn:active .btn-content {
  transform: translateX(4px) scale(1.02);
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse {
  0%,
  100% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  50% {
    filter: drop-shadow(0 2px 8px rgba(0, 188, 212, 0.6));
  }
}

@media (max-width: 1400px) {
  .year-comparison-btn {
    position: static;
    width: calc(100% - 32px);
    max-width: 1200px;
    margin-bottom: 16px;
    transform: none;
  }

  .btn-content {
    flex-direction: row;
    justify-content: center;
    padding: 8px 12px;
    min-width: 0;
    background: #333;
    border: 1px solid #555;
    border-radius: 8px;
    box-shadow: none;
  }

  .btn-icon {
    font-size: 16px;
    animation: none;
  }

  .btn-text {
    flex-direction: row;
    gap: 4px;
    font-size: 12px;
  }

  .year-comparison-btn:hover .btn-content,
  .year-comparison-btn:active .btn-content {
    transform: none;
    background: #3a3a3a;
    border-color: #00bcd4;
    box-shadow: none;
  }
}

.year-comparison-btn:focus-visible {
  outline: 2px solid #00bcd4;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .year-comparison-btn,
  .btn-content,
  .btn-glow {
    transition: none;
  }
  .btn-icon,
  .year-comparison-btn:hover .btn-icon {
    animation: none;
  }
}

.content-container {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 16px 100px;
}

.control-container {
  display: flex;
  box-sizing: border-box;
  width: calc(100% - 32px);
  max-width: 1200px;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
}

.control-container > * {
  margin-bottom: 0;
  min-width: 0;
}

.control-container :deep(.version-type-selector),
.control-container :deep(.ranked-filter) {
  flex: 1 1 340px;
}

.control-container :deep(.filter-group) {
  min-width: 0;
  flex: 1;
}

.empty-state {
  padding: 64px 24px;
  text-align: center;
}

.empty-state strong {
  font-size: 16px;
}
.empty-state p {
  margin-top: 12px;
  color: #ccc;
  font-size: 14px;
}

.results-toolbar {
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.refresh-status {
  color: #ccc;
  font-size: 13px;
  line-height: 1.5;
  min-width: 0;
}

.refresh-error {
  color: #ffb4a9;
}

.refresh-button {
  min-width: 88px;
  min-height: 40px;
}

.refresh-button:focus-visible {
  outline: 2px solid #00bcd4;
  outline-offset: 3px;
}

.container {
  height: 100%;
  width: 100%;
  max-width: 1200px;
}

.button-group {
  margin-top: 10px;
}

.leaderboard {
  width: 100%;
  color: white;
  text-align: center;
  background-color: #333;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.leaderboard-head {
  background-color: #444;
  display: flex;
  font-size: 1.1em;
  height: 60px;
  font-weight: 600;
  color: #fff;
}

.leaderboard-head > div {
  flex: 1;
  padding: 16px 8px;
  border-bottom: 2px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaderboard-body {
  display: flex;
  flex-direction: column;
}

.leaderboard.is-empty {
  min-width: 0;
}

.leaderboard.is-empty .leaderboard-head {
  display: none;
}

@media (max-width: 780px) {
  .content-container {
    padding: 16px 16px 80px;
  }

  .leaderboard-head {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 112px;
    gap: 8px;
    padding: 0 12px;
    height: 48px;
    border-bottom: 2px solid #555;
  }

  .leaderboard-head > div {
    min-width: 0;
    padding: 12px 0;
    font-size: 0.9em;
    border: 0;
  }

  .leaderboard-head .player-cell {
    justify-content: flex-start;
  }

  .leaderboard-head .date-cell,
  .leaderboard-head .video-cell {
    display: none;
  }

  .refresh-status {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .refresh-button {
    transition: none;
  }
}
</style>
