<template>
  <!-- 通知提示 -->
  <Notification
    v-model:visible="showNotification"
    :message="notificationMessage"
    :type="notificationType"
    :duration="5000"
    @close="hideNotification"
  />
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
  </div>
  <div v-if="isLoading" class="content-container">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
  </div>
  <div v-else class="content-container">
    <div class="container">
      <table class="leaderboard">
        <thead class="leaderboard-head">
          <tr class="head">
            <th>排名</th>
            <th>玩家</th>
            <th>IGT</th>
            <th>记录时间</th>
            <th>记录视频</th>
          </tr>
        </thead>
        <tbody class="leaderboard-body">
          <tr v-for="(info, index) in slicedata" class="stats" @click="navToRunDetail(info.run_id)">
            <td class="rank-cell">{{ info.rank }}</td>
            <td class="player-cell" v-html="safeDisplay(info.nickname)"></td>
            <td class="igt-cell" v-html="safeDisplay(info.igt)"></td>
            <td class="date-cell" v-html="safeDisplay(info.date)"></td>
            <td class="video-cell">
              <a
                :href="info.videolink"
                target="_blank"
                @click.stop
                @click.prevent="openVideo(info.videolink)"
                class="video-link"
              >
                <SvgIcon name="vedio" color="white"></SvgIcon>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination v-model:currentPage="state.page" :totalPages="pages" />
  </div>
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, computed, onActivated, watch } from 'vue';
import { useStatsStore } from '@/stores/stats.ts';
import SvgIcon from '@/components/icons/index.vue';
import { useRouter, useRoute } from 'vue-router';
import RankedFilter from '@/components/RankedFilter.vue';
import Pagination from '@/components/Pagination.vue';
import Notification from '@/components/Notification.vue';
import { safeDisplay } from '@/utils/security';
import { createURLStateManager } from '@/utils/urlStateManage';
import VersionTypeSelector from '@/components/VersionTypeSelector.vue';

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

// 通知提示相关
const showNotification = ref<boolean>(false);
const notificationMessage = ref<string>('');
const notificationType = ref<'error' | 'success' | 'info'>('info');
// 排名数据
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const filteredData = ref<any[]>([]);
const slicedata = computed(() =>
  filteredData.value.slice((state.value.page - 1) * 10, state.value.page * 10)
);
// 分页
const pages = computed(() => Math.ceil(filteredData.value.length / 10));

// 版本选择
const handleSelectionChange = (version: string, type: string) => {
  stateManager.setMultiple({
    version,
    type,
    page: 1,
  });

  statsStore.getStats(version, type);
  stateManager.saveToStorage();
};

// 跳转至详情页
const navToRunDetail = (id: number) => {
  router.push(`/run/${id}`);
};

// 打开视频链接
const openVideo = (url: string) => {
  window.open(url, '_blank');
};

// 显示通知
const showNotificationMessage = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
  notificationMessage.value = message;
  notificationType.value = type;
  showNotification.value = true;
};

// 隐藏通知
const hideNotification = () => {
  showNotification.value = false;
};

// 检查URL中的错误参数
const checkUrlError = () => {
  if (route.query.error === 'unauthorized') {
    showNotificationMessage('您没有权限访问该页面，需要管理员权限', 'error');
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

// 每次激活页面时，确保数据正确显示
onActivated(() => {
  if (statsdata.value.length === 0) {
    statsStore.getStats('1.16.1', 'RSG');
  } else {
    filteredData.value = statsdata.value;
  }
  checkUrlError();
});
</script>

<style scoped>
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 100px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00bcd4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: white;
  font-size: 1.2em;
  text-align: center;
}

.button-group {
  margin-top: 10px;
}

.leaderboard {
  width: 100%;
  color: white;
  text-align: center;
  border-collapse: collapse;
  table-layout: fixed;
  background-color: #333;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.leaderboard-head {
  background-color: #444;
}

.head {
  font-size: 1.1em;
  height: 60px;
  font-weight: 600;
  color: #fff;
}

.head th {
  padding: 16px 8px;
  border-bottom: 2px solid #555;
}

.stats {
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #444;
}

.stats:hover {
  background-color: #3a3a3a;
  transform: translateY(-1px);
}

.stats:last-child {
  border-bottom: none;
}

.stats td {
  padding: 16px 8px;
  vertical-align: middle;
}

.rank-cell {
  font-weight: 600;
  color: #00bcd4;
}

.player-cell {
  font-weight: 500;
}

.igt-cell {
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.date-cell {
  color: #ccc;
  font-size: 0.9em;
}

.video-cell {
  width: 60px;
}

.video-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: rgba(0, 188, 212, 0.1);
  border: 1px solid rgba(0, 188, 212, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.video-link:hover {
  background-color: rgba(0, 188, 212, 0.2);
  border-color: rgba(0, 188, 212, 0.5);
  transform: scale(1.05);
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

  .head th,
  .stats td {
    padding: 12px 6px;
    font-size: 0.9em;
  }
}
</style>
