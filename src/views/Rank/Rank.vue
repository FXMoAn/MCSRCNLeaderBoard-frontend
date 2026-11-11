<template>
  <div class="page-layout">
    <div class="main-column">
      <!-- 游戏信息面板 -->
      <section class="game-header">
        <div class="game-cover">
          <img :src="coverImage" alt="Minecraft: Java Edition 主视觉" class="cover-image" />
        </div>
        <div class="game-meta">
          <h1 class="game-title">Minecraft: Java Edition</h1>
          <p class="game-sub">我的世界：Java版</p>
        </div>
        <div class="game-actions" v-if="userStore.isBinding">
          <router-link :to="`/profile/${userStore.userInfo.id}`" class="profile-btn"
            >个人主页</router-link
          >
        </div>
      </section>

      <!-- 榜单面板 -->
      <section class="board-panel">
        <div class="category-bar">
          <div class="cat-row">
            <span class="cat-pill level1" :aria-current="true">Any%</span>
          </div>
          <div class="filter-groups">
            <div class="filter-group">
              <span class="field-label">速通类型（Any%）</span>
              <div class="filter-pills" role="tablist" aria-label="速通类型">
                <button
                  v-for="option in TYPE_SELECTOR_OPTIONS"
                  :key="option.value"
                  type="button"
                  role="tab"
                  class="cat-pill"
                  :class="{ active: state.type === option.value }"
                  :aria-selected="state.type === option.value"
                  @click="setType(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="filter-group">
              <label class="field-label" for="version-select">版本范围（{{ state.type }}）</label>
              <select
                id="version-select"
                class="version-select"
                :value="state.version"
                aria-label="版本范围"
                @change="setVersion(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="v in versionOptions" :key="v.value" :value="v.value">
                  {{ v.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="actions-row">
          <div class="board-filters">
            <PrimaryCheckBox
              :modelValue="state.newRecord"
              label="只看新成绩"
              title="近30天内的成绩"
              class="new-record-filter"
              @update:modelValue="handleNewRecordChange"
            />
            <div class="refresh-status" role="status" aria-live="polite">
              <span v-if="isLoading">{{
                statsdata.length ? '正在更新榜单…' : '正在加载榜单…'
              }}</span>
              <span v-else-if="loadError" class="refresh-error">{{ loadError }}</span>
            </div>
          </div>
          <div class="board-actions">
            <button
              type="button"
              class="pill-btn refresh-button"
              :disabled="isLoading"
              :aria-busy="isLoading"
              :aria-label="isLoading ? '正在刷新榜单' : '刷新榜单'"
              :title="isLoading ? '刷新中…' : '刷新榜单'"
              @click="handleRefresh"
            >
              <RefreshRight
                class="refresh-icon"
                :class="{ 'is-refreshing': isLoading }"
                width="18"
                height="18"
                aria-hidden="true"
              />
            </button>
            <a
              class="pill-btn"
              href="https://wiki.mcspeedrun.cn"
              target="_blank"
              rel="noopener noreferrer"
              >规则</a
            >
            <router-link to="/user-upload" class="pill-btn">提交成绩</router-link>
          </div>
        </div>
        <Loading v-if="isLoading && statsdata.length === 0" />
        <div class="container" v-else :aria-busy="isLoading">
          <div class="leaderboard" :class="{ 'is-empty': filteredData.length === 0 }">
            <div class="leaderboard-head">
              <div class="rank-cell">#</div>
              <div class="player-cell">玩家</div>
              <div class="igt-cell">IGT</div>
              <div class="date-cell">日期</div>
              <div class="version-cell">版本</div>
              <div class="video-cell">视频</div>
            </div>
            <div class="leaderboard-body">
              <div v-if="filteredData.length === 0" class="empty-state" role="status">
                <strong>{{
                  loadError ? '榜单加载失败' : state.newRecord ? '暂无新成绩' : '该分类暂无成绩'
                }}</strong>
                <p>
                  {{
                    loadError
                      ? '请点击上方刷新图标重试。'
                      : state.newRecord
                        ? '取消“只看新成绩”可查看全部成绩。'
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
                :version="info.version"
                :videolink="info.videolink"
                :runId="info.run_id"
                :is_new_record="info.is_new_record"
                @click="navToRunDetail"
              />
            </div>
          </div>
        </div>
        <Pagination
          class="board-pagination"
          :currentPage="state.page"
          :pageSize="state.pageSize"
          :totalPages="pages"
          :totalItems="filteredData.length"
          :disabled="isLoading || !hasLoaded"
          @update:currentPage="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { RefreshRight } from '@element-plus/icons-vue';
import { LEADERBOARD_CACHE_TTL, useStatsStore } from '@/stores/stats.ts';
import { createURLStateManager } from '@/utils/urlStateManage';
import { showErrorNotification } from '@/utils/notification';
import { DEFAULT_PAGE_SIZE, normalizePage, normalizePageSize } from '@/constants/pagination';
import { TYPE_SELECTOR_OPTIONS, VERSION_RANGE_OPTIONS } from '@/constants/common';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores';
import Pagination from '@/components/Pagination.vue';
import Loading from '@/components/common/Loading.vue';
import PrimaryCheckBox from '@/components/common/PrimaryCheckBox.vue';
import RankCard from './components/RankCard.vue';
import coverImage from '@/assets/minecraft-cover.webp';

interface RankState {
  version: string;
  type: string;
  page: number;
  pageSize: number;
  newRecord: boolean;
}

const stateManager = createURLStateManager<RankState>({
  defaultState: {
    version: '1.16.1',
    type: 'RSG',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    newRecord: false,
  },
  urlFields: ['version', 'type', 'page', 'pageSize', 'newRecord'],
  transformers: {
    page: { toUrl: String, fromUrl: normalizePage },
    pageSize: { toUrl: String, fromUrl: normalizePageSize },
    newRecord: { toUrl: String, fromUrl: (value) => value === 'true' || value === '1' },
  },
  storageKey: 'rank_state',
  storage: 'memory',
});

const rangesFor = (type: string) => VERSION_RANGE_OPTIONS[type] ?? [];
const isValidType = (type: string) => TYPE_SELECTOR_OPTIONS.some((option) => option.value === type);

// 旧链接与旧内存状态里存的是代表版本，需要映射到新区间；无法识别时回退第一项。
const normalizeVersion = (type: string, version: string): string => {
  const options = rangesFor(type);
  if (options.some((option) => option.value === version)) return version;
  if (version === '1.16.1,1.20' || (type === 'RSG' && version === '1.20')) return '1.16.1';
  return options[0]?.value ?? '1.16.1';
};

const router = useRouter();
const route = useRoute();
const statsStore = useStatsStore();
const userStore = useUserStore();
const restoredState = stateManager.initialize();
const state = stateManager.getState();
const restoredType = isValidType(restoredState.type) ? restoredState.type : 'RSG';
stateManager.setMultiple(
  {
    type: restoredType,
    version: normalizeVersion(restoredType, restoredState.version),
    page: normalizePage(restoredState.page),
    pageSize: normalizePageSize(restoredState.pageSize),
    newRecord: restoredState.newRecord === true,
  },
  false
);

const hasLoaded = ref(false);
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const loadError = computed(() => statsStore.loadError);
const filteredData = computed(() =>
  state.value.newRecord ? statsdata.value.filter((run) => run.is_new_record) : statsdata.value
);
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

const handleNewRecordChange = (newRecord: boolean) => {
  saveState({ newRecord, page: 1 });
};

const handleSelectionChange = async (version: string, type: string) => {
  saveState({ version, type, page: 1 });
  await statsStore.getStats(version, type);
};

// 切换类型时版本区间跟随变化：旧区间在新类型下无效则映射到最接近的区间。
const setType = (type: string) => {
  if (type === state.value.type) return;
  const nextVersion = normalizeVersion(type, state.value.version);
  void handleSelectionChange(nextVersion, type);
};
const setVersion = (version: string) => {
  if (version !== state.value.version) void handleSelectionChange(version, state.value.type);
};

const versionOptions = computed(() => rangesFor(state.value.type));

const handleRefresh = () => {
  if (isLoading.value) return;
  void statsStore.refreshStats(state.value.version, state.value.type);
};

const refreshIfStale = (allowRetry = false) => {
  if (!hasLoaded.value || document.hidden || !navigator.onLine || isLoading.value) return;
  // 后台更新失败后，等待手动刷新或返回页面再重试。
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

const navToRunDetail = (id: number) => router.push(`/run/${id}`);

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
.page-layout {
  box-sizing: border-box;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px 32px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.main-column {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ---- 游戏信息面板 ---- */
.game-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px 12px 0 0;
  border-bottom: none;
}

.game-cover {
  flex: 0 0 96px;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-light);
}

.cover-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.game-meta {
  flex: 1;
  min-width: 0;
}

.game-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #fff;
}

.game-sub {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.game-actions {
  flex: 0 0 auto;
}

.profile-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  background: var(--accent);
  color: #0d1f0e;
  font-weight: 700;
  font-size: 14px;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
  box-shadow: 0 2px 10px rgba(76, 175, 80, 0.35);
}

.profile-btn:hover {
  background: var(--accent-bright);
  color: #0d1f0e;
  transform: translateY(-1px);
}

.profile-btn:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 3px;
}

/* ---- 榜单面板 ---- */
.board-panel {
  --leaderboard-columns: 52px minmax(0, 1fr) minmax(120px, 0.55fr) 112px 88px 72px;
  --leaderboard-column-gap: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0 0 12px 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.category-bar {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* 第二行：速通类型 + 版本范围两组并排，标签在控件上方（speedrun.com 样式）。 */
.filter-groups {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 一级分类（Any%）固定为唯一项目，展示为常亮的绿色填充胶囊。 */
.cat-pill.level1 {
  background: var(--accent);
  border-color: var(--accent);
  color: #0d1f0e;
  cursor: default;
}

.cat-pill.level1:hover {
  color: #0d1f0e;
  border-color: var(--accent);
}

.cat-pill {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--panel-raised);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.cat-pill:hover {
  color: #fff;
  border-color: var(--accent);
}

.cat-pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #0d1f0e;
}

.cat-pill:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 2px;
}

.field-label {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.version-select {
  padding-block: 8px;
  background-color: var(--panel-raised);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  min-width: 130px;
}

.version-select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

/* ---- 刷新工具栏 ---- */
.actions-row {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
}

.refresh-status {
  color: var(--text-secondary);
  font-size: 13px;
}

.refresh-error {
  color: #ffb4ab;
}

.board-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
}

.new-record-filter {
  min-height: 36px;
  flex-shrink: 0;
}

.board-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.refresh-status:empty {
  display: none;
}

.pill-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-height: 36px;
  padding: 0 20px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
  background: var(--panel-raised);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.pill-btn:hover:not(:disabled) {
  color: #fff;
  border-color: var(--accent);
  background: rgba(76, 175, 80, 0.08);
}

.pill-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.pill-btn:active:not(:disabled) {
  background-color: var(--border);
}

.refresh-button {
  width: 36px;
  padding: 0;
  cursor: pointer;
}

.refresh-icon {
  width: 18px;
  height: 18px;
  color: inherit;
}

.refresh-icon :deep(path) {
  color: inherit;
}

.is-refreshing {
  animation: refresh-spin 0.9s linear infinite;
}

@keyframes refresh-spin {
  to {
    transform: rotate(360deg);
  }
}

.pill-btn:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 2px;
}

.container {
  height: 100%;
  width: 100%;
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
  color: var(--text-secondary);
  font-size: 14px;
}

/* ---- 榜单表 ---- */
.leaderboard {
  width: 100%;
  color: #fff;
  text-align: center;
  background: var(--panel-raised);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.leaderboard-head {
  background: rgba(0, 0, 0, 0.25);
  display: grid;
  grid-template-columns: var(--leaderboard-columns);
  column-gap: var(--leaderboard-column-gap);
  padding: 0 12px;
  font-size: 13px;
  height: 44px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.leaderboard-head > div {
  min-width: 0;
  padding: 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaderboard-head .player-cell {
  justify-content: flex-start;
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

/* ---- 分页（嵌入面板） ---- */
.board-pagination {
  margin-top: 12px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--border);
  border-radius: 0;
  padding: 16px 0 0;
}

/* ---- 响应式 ---- */
@media (max-width: 780px) {
  .page-layout {
    padding: 0 16px 24px;
  }

  .game-header {
    flex-wrap: wrap;
    padding: 16px;
    gap: 14px;
  }

  .game-cover {
    flex: 0 0 64px;
    width: 64px;
    height: 64px;
  }

  .category-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .game-title {
    font-size: 20px;
  }

  .game-actions {
    width: 100%;
  }

  .profile-btn {
    width: 100%;
    justify-content: center;
  }

  .board-panel {
    --leaderboard-columns: 36px minmax(0, 1fr) 104px;
    --leaderboard-column-gap: 8px;
    padding: 12px;
  }

  .category-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-groups {
    gap: 16px;
  }

  .version-select {
    width: 100%;
  }

  .leaderboard-head {
    display: grid;
    padding: 0 12px;
    height: 48px;
  }

  .leaderboard-head > div {
    min-width: 0;
    padding: 12px 0;
    font-size: 0.9em;
  }

  .leaderboard-head .player-cell {
    justify-content: flex-start;
  }

  .leaderboard-head .date-cell,
  .leaderboard-head .version-cell,
  .leaderboard-head .video-cell {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-refreshing {
    animation: none;
  }
  .cat-pill,
  .pill-btn,
  .profile-btn {
    transition: none;
  }
}
</style>
