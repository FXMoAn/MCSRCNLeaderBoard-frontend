<template>
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
