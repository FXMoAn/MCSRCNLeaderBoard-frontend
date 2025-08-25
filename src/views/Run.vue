<template>
  <div v-if="runInfo" class="content">
    <div class="video-container">
      <iframe
        class="video-iframe"
        :src="getPlayerUrl"
        scrolling="no"
        border="0"
        frameborder="no"
        framespacing="0"
        allowfullscreen="true"
      ></iframe>
    </div>
    <div class="info-container">
      <h2 class="info-title">记录详情</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">玩家</span>
          <span class="info-value">{{ runInfo.users.nickname }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">日期</span>
          <span class="info-value">{{ runInfo.date }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">IGT</span>
          <span class="info-value igt-value">{{ runInfo.igt }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">版本</span>
          <span class="info-value">{{ runInfo.version }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">类型</span>
          <span class="info-value">{{ runInfo.type }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">种子</span>
          <span class="info-value">{{ runInfo.seed || "无" }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">备注</span>
          <span class="info-value">{{ runInfo.remarks || "无" }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="content">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { onBeforeMount, ref, computed } from "vue";
import type { Run } from "@/stores/stats";
import { extractBVId, buildPlayerUrl } from "@/utils/bilibili";
import type { RunInfo } from "@/types/CommonTypes";

const route = useRoute();
const id = route.params.id;

const runInfo = ref<RunInfo>();

const getRunInfo = async () => {
  try {
    const { data, error } = await supabase
      .from("runs")
      .select(`*,users(*)`)
      .eq("id", id);
    if (error) {
      console.error(error);
    } else {
      runInfo.value = data[0];
    }
  } catch (error) {
    console.error(error);
  }
};

const getBVId = computed(() => {
  return extractBVId(runInfo.value?.videolink || "");
});

const getPlayerUrl = computed(() => {
  const bvid = getBVId.value;
  if (!bvid) return "";

  return buildPlayerUrl(bvid, { isOutside: true, autoplay: false });
});

onBeforeMount(() => {
  getRunInfo();
});
</script>

<style scoped>
.content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
  gap: 30px;
  box-sizing: border-box;
  overflow-x: hidden;
}

.video-container {
  width: 100%;
  max-width: 900px;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid #444;
  box-sizing: border-box;
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.info-container {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

.info-title {
  color: #fff;
  font-size: 1.8em;
  font-weight: 600;
  text-align: center;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #444;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
}

.info-grid .info-item:nth-child(7) {
  grid-column: 1 / -1;
}

.info-grid .info-item:nth-child(7) .info-value {
  white-space: normal;
  word-wrap: break-word;
  overflow: visible;
}

.info-item {
  background-color: #333;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}

.info-item:hover {
  border-color: #555;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.info-label {
  color: #999;
  font-size: 0.9em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  color: #fff;
  font-size: 1.2em;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.igt-value {
  color: #00bcd4;
  font-family: "Courier New", monospace;
  font-weight: 600;
  font-size: 1.4em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 768px) {
  .content {
    padding: 15px;
    gap: 20px;
  }

  .video-container {
    max-width: 100%;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .info-grid .info-item:nth-child(7) {
    grid-column: 1;
  }

  .info-item {
    padding: 16px;
  }

  .info-title {
    font-size: 1.5em;
  }

  .info-value {
    font-size: 1.1em;
  }

  .igt-value {
    font-size: 1.3em;
  }
}

@media (max-width: 480px) {
  .content {
    padding: 10px;
  }

  .info-item {
    padding: 14px;
  }

  .info-title {
    font-size: 1.3em;
  }
}
</style>
