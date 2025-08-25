<template>
  <RankedFilter @confirmFilter="handleConfirmFilter" />
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
          <tr
            v-for="(info, index) in slicedata"
            class="stats"
            @click="navToRunDetail(info.run_id)"
          >
            <td class="rank-cell">{{ info.rank }}</td>
            <td class="player-cell">{{ info.nickname }}</td>
            <td class="igt-cell">{{ info.igt }}</td>
            <td class="date-cell">{{ info.date }}</td>
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
    <div class="choosepage">
      <button class="control prev" @click="prevpage" :disabled="page <= 1">
        <span>&lt;</span>
      </button>
      <div class="pagenumber">{{ page }}/{{ pages }}</div>
      <button class="control next" @click="nextpage" :disabled="page >= pages">
        <span>&gt;</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/main.css";
import { ref, onMounted, computed, onActivated, watch } from "vue";
import { useStatsStore } from "@/stores/stats.ts";
import SvgIcon from "@/components/icons/index.vue";
import { useRouter } from "vue-router";
import RankedFilter from "@/components/RankedFilter.vue";

const router = useRouter();
const statsStore = useStatsStore();
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const filteredData = ref<any[]>([]);
const slicedata = computed(() =>
  filteredData.value.slice((page.value - 1) * 10, page.value * 10)
);
const page = ref(1);
const pages = computed(() => Math.ceil(filteredData.value.length / 10));

//获取数据
const handleSelectionChange = ({
  version,
  type,
}: {
  version: string;
  type: string;
}) => {
  statsStore.getStats(version, type);
};

// 实现页码增减，内容改变
const prevpage = () => {
  if (page.value > 1) {
    page.value -= 1;
  }
};

const nextpage = () => {
  if (page.value < pages.value) {
    page.value += 1;
  }
};

const navToRunDetail = (id: number) => {
  router.push(`/run/${id}`);
};

const openVideo = (url: string) => {
  window.open(url, "_blank");
};

const handleConfirmFilter = (filter: { igt: string; nickname: string }) => {
  if (filter.igt === "0,99" && filter.nickname === "") {
    filteredData.value = statsdata.value;
  } else {
  filteredData.value = statsdata.value.filter((item) => {
    return (
      Number(item.igt.split(":")[0]) >= Number(filter.igt.split(",")[0]) &&
      Number(item.igt.split(":")[0]) < Number(filter.igt.split(",")[1]) &&
        item.nickname.toLowerCase().includes(filter.nickname.toLowerCase())
      );
    });
  }
};

watch(statsdata, (newVal) => {
  filteredData.value = newVal;
});

onMounted(() => {
  statsStore.getStats("1.16.1", "RSG");
});

onActivated(() => {
  // 如果当前没有数据，则重新获取
  if (statsdata.value.length === 0) {
    statsStore.getStats("1.16.1", "RSG");
  }
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
  font-family: "Courier New", monospace;
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

.choosepage {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  gap: 16px;
  font-size: 1rem;
}

.control {
  background-color: #333;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #555;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.control:hover:not(:disabled) {
  background-color: #444;
  border-color: #00bcd4;
  transform: translateY(-2px);
}

.control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.pagenumber {
  color: white;
  font-weight: 500;
  min-width: 60px;
  text-align: center;
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

  .choosepage {
    margin-top: 20px;
    gap: 12px;
  }

  .control {
    width: 36px;
    height: 36px;
  }
}
</style>
