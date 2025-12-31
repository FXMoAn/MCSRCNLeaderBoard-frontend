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

    <OtherFilter
      @confirmFilter="handleOtherConfirmFilter"
      :initialIsNewRecord="isNewRecord"
    />
  </div>
  <div class="content-container">
    <Loading v-if="isLoading" />
    <div class="container" v-else>
      <div class="leaderboard">
        <div class="leaderboard-head">
          <div class="rank-cell">排名</div>
          <div class="player-cell">玩家</div>
          <div class="igt-cell">IGT</div>
          <div class="date-cell">记录时间</div>
          <div class="video-cell">记录视频</div>
        </div>
        <div class="leaderboard-body">
          <RankCard
            v-for="(info, index) in slicedata"
            :key="info.run_id"
            :rank="info.rank"
            :nickname="info.nickname"
            :userId="info.userid"
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
    <Pagination v-model:currentPage="state.page" :totalPages="pages" />
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, computed, onActivated, watch } from 'vue';
import { useStatsStore } from '@/stores/stats.ts';
import { safeDisplay } from '@/utils/security';
import { createURLStateManager } from '@/utils/urlStateManage';
import { showErrorNotification } from '@/utils/notification';
// 组件
import { useRouter, useRoute } from 'vue-router';
import RankedFilter from '@/components/RankedFilter.vue';
import Pagination from '@/components/Pagination.vue';
import VersionTypeSelector from '@/components/VersionTypeSelector.vue';
import Loading from '@/components/common/Loading.vue';
import RankCard from './components/RankCard.vue';
import OtherFilter from '@/components/OtherFilter.vue';

// 定义状态类型
interface RankState {
  version: string;
  type: string;
  igt: string;
  nickname: string;
  page: number;
}

// 创建状态管理器
const stateManager = createURLStateManager<RankState>({
  defaultState: {
    version: '1.16.1',
    type: 'RSG',
    igt: '0,99',
    nickname: '',
    page: 1,
  },
  urlFields: ['version', 'type', 'igt', 'nickname', 'page'],
  transformers: {
    page: {
      toUrl: (value) => value.toString(),
      fromUrl: (value) => Number(value) || 1,
    },
  },
  storageKey: 'rank_state',
  storageExpiry: 24 * 60 * 60 * 1000,
});

const router = useRouter();
const route = useRoute();
const statsStore = useStatsStore();

// 立即初始化状态管理器，获取恢复的状态
const restoredState = stateManager.initialize();
const state = stateManager.getState();

// 排名数据
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const filteredData = ref<any[]>([]);
const slicedata = computed(() =>
  filteredData.value.slice((state.value.page - 1) * 10, state.value.page * 10)
);
// 分页
const pages = computed(() => Math.ceil(filteredData.value.length / 10));
const isNewRecord = ref(false);

// 版本选择
const handleSelectionChange = (version: string, type: string) => {
  stateManager.setMultiple({
    version,
    type,
    page: 1,
  });

  isNewRecord.value = false;
  statsStore.getStats(version, type);
  stateManager.saveToStorage();
};

// 跳转至详情页
const navToRunDetail = (id: number) => {
  router.push(`/run/${id}`);
};

// 跳转至年份对比页
const navToYearComparison = () => {
  router.push('/24to25');
};

// 打开视频链接
const openVideo = (url: string) => {
  window.open(url, '_blank');
};

// 检查URL中的错误参数
const checkUrlError = () => {
  if (route.query.error === 'unauthorized') {
    showErrorNotification('您没有权限访问该页面，需要管理员权限');
    // 清除URL中的错误参数
    router.replace({ query: {} });
  }
};

// 确认筛选
const handleConfirmFilter = (filter: { igt: string; nickname: string }) => {
  // 检查筛选条件是否真的改变了
  const filterChanged = filter.igt !== state.value.igt || filter.nickname !== state.value.nickname;

  // 只有在筛选条件改变时才重置页码
  const updates: Partial<RankState> = {
    igt: filter.igt,
    nickname: filter.nickname,
  };

  if (filterChanged) {
    updates.page = 1;
  }

  stateManager.setMultiple(updates);

  if (filter.igt === '0,99' && filter.nickname === '') {
    filteredData.value = statsdata.value;
  } else {
    filteredData.value = statsdata.value.filter((item) => {
      return (
        Number(item.igt.split(':')[0]) >= Number(filter.igt.split(',')[0]) &&
        Number(item.igt.split(':')[0]) < Number(filter.igt.split(',')[1]) &&
        item.nickname.toLowerCase().includes(filter.nickname.toLowerCase())
      );
    });
  }

  stateManager.saveToStorage();
  isNewRecord.value = false;
};

// 确认筛选
const handleOtherConfirmFilter = (value: boolean) => {
  isNewRecord.value = value;
};

// 初始化
onMounted(async () => {
  state.value.page = restoredState.page;
  state.value.version = restoredState.version;
  state.value.type = restoredState.type;

  await statsStore.getStats(restoredState.version, restoredState.type);
  filteredData.value = statsdata.value;

  if (restoredState.igt !== '0,99' || restoredState.nickname !== '') {
    handleConfirmFilter({
      igt: restoredState.igt,
      nickname: restoredState.nickname,
    });
  }
  checkUrlError();
});

// 监听新纪录筛选变化
watch(isNewRecord, (newVal) => {
  filteredData.value = statsdata.value.filter((item) => {
    if (newVal) {
      return item.is_new_record;
    } else {
      return true;
    }
  });
});

// 监听分页变化
watch(
  () => state.value.page,
  (newPage) => {
    stateManager.set('page', newPage);
    stateManager.saveToStorage();
  }
);

// 监听数据变化
watch(
  statsdata,
  (newVal) => {
    filteredData.value = newVal;
    // 只有在没有筛选条件时才重置页码，避免覆盖用户设置的分页
    if (state.value.igt === '0,99' && state.value.nickname === '') {
      state.value.page = 1;
    }
  },
  { immediate: true }
);
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
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.4), 
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
  box-shadow: 0 8px 30px rgba(0, 188, 212, 0.6),
              0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  border-color: rgba(0, 188, 212, 0.9);
}

.year-comparison-btn:hover .btn-glow {
  opacity: 1;
}

.year-comparison-btn:hover .btn-icon {
  animation: float 1.5s ease-in-out infinite, pulse 2s ease-in-out infinite;
}

.year-comparison-btn:active .btn-content {
  transform: translateX(4px) scale(1.02);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes pulse {
  0%, 100% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  50% {
    filter: drop-shadow(0 2px 8px rgba(0, 188, 212, 0.6));
  }
}

@media (max-width: 780px) {
  .year-comparison-btn {
    left: 10px;
  }

  .btn-content {
    padding: 12px 8px;
    min-width: 60px;
  }

  .btn-icon {
    font-size: 20px;
  }

  .btn-text {
    font-size: 10px;
  }
}

.content-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 0 100px 0;
}

.control-container {
  display: flex;
  gap: 20px;
  justify-content: space-between;
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

@media (max-width: 780px) {
  .content-container {
    padding: 10px 0 80px 0;
  }

  .container {
    overflow-x: auto;
  }

  .leaderboard {
    min-width: 600px;
  }

  .leaderboard-head > div {
    padding: 12px 6px;
    font-size: 0.9em;
  }
}
</style>
