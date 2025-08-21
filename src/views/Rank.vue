<template>
  <!-- <ButtonGroup
      class="button-group"
      @selection-changed="handleSelectionChange"
    /> -->
  <div v-if="isLoading" class="content-container">
    <p class="loading">加载中...</p>
  </div>
  <div v-else class="content-container">
    <div class="container">
      <table class="leaderboard">
        <tbody class="leaderboard-body">
          <tr class="head">
            <th>排名</th>
            <th>玩家</th>
            <th>IGT</th>
            <th>记录时间</th>
            <th>记录视频</th>
          </tr>
          <tr
            v-for="(info, index) in slicedata"
            class="stats"
            @click="navToRunDetail(info.run_id)"
          >
            <td>{{ getRank(index) }}</td>
            <td>{{ info.nickname }}</td>
            <td>{{ info.igt }}</td>
            <td>{{ info.date }}</td>
            <td>
              <a
                :href="info.videolink"
                target="_blank"
                @click.stop
                @click.prevent="openVideo(info.videolink)"
              >
                <SvgIcon name="vedio" color="white"></SvgIcon>
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="choosepage">
      <button class="control prev" @click="prevpage"><</button>
      <div class="pagenumber">{{ page }}/{{ pages }}</div>
      <button class="control next" @click="nextpage">></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/main.css";
import { ref, onMounted, computed, onActivated } from "vue";
import { useStatsStore } from "@/stores/stats.ts";
import SvgIcon from "@/components/icons/index.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const statsStore = useStatsStore();
const isLoading = computed(() => statsStore.isLoading);
const statsdata = computed(() => statsStore.currStats);
const slicedata = computed(() =>
  statsdata.value.slice((page.value - 1) * 10, page.value * 10)
);
const page = ref(1);
const pages = computed(() => statsStore.pages);

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

// 规范每个数据的格式
const getRank = (index: number) => {
  return index + 1 + (page.value - 1) * 10;
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

onMounted(() => {
  statsStore.getStats("1.16.1", "RSG");
});

// 当页面被激活时（从其他页面返回），检查是否需要重新获取数据
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
  padding-bottom: 100px;

  .container {
    height: 100%;
  }
}

.loading {
  color: white;
  font-size: 1.5em;
  text-align: center;
  margin-top: 100px;
}

.button-group {
  margin-top: 10px;
}

.leaderboard {
  width: 90vw;
  height: 100%;
  margin-top: 10px;
  color: white;
  text-align: center;
  border-collapse: collapse;
  table-layout: fixed;

  .leaderboard-body {
    height: 100%;

    .head {
      font-size: 1.5em;
      height: 50px;
    }

    .stats {
      font-size: 1.5em;
      height: 50px;
    }
  }
}
.choosepage {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 10px;
  font-size: 1rem;
  .control {
    background-color: var(--bgcolor);
    color: white;
    width: 2rem;
    height: 2rem;
    border-radius: 5px;
    border: 1px solid;
    cursor: pointer;
  }
  .pagenumber {
    color: white;
  }
}

.stats {
  cursor: pointer;
  transition: all 0.3s ease;
  &:hover {
    background-color: var(--hovercolor);
  }
}

@media (max-width: 780px) {
  .content {
    width: 100%;
    max-width: 780px;
  }

  .container {
    position: relative;
    overflow: auto;
    width: 100%;
  }

  .leaderboard {
    width: max-content;
    min-width: 780px;
    overflow-x: auto;
  }
}
</style>
