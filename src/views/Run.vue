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
        <span class="info-value">{{ runInfo.igt }}</span>
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
        <span class="info-label">备注</span>
        <span class="info-value">{{ runInfo.remarks || "无" }}</span>
      </div>
    </div>
  </div>
  <div v-else class="content">
    <p>加载中...</p>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { supabase } from "@/lib/supabaseClient";
import { onBeforeMount, ref, computed } from "vue";
import type { Run } from "@/stores/stats";
import { extractBVId, buildPlayerUrl } from "@/utils/bilibili";

const route = useRoute();
const id = route.params.id;

interface RunInfo {
  id: number;
  userid: string;
  nickname: string;
  igt: string;
  date: string;
  version: string;
  type: string;
  videolink: string;
  remarks: string;
  seed: string;
  users: {
    id: string;
    nickname: string;
    ingamename: string;
  };
}

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
  justify-content: center;

  .video-container {
    width: 80%;
    aspect-ratio: 16 / 9;

    .video-iframe {
      width: 100%;
      height: 100%;
    }
  }

  .info-container {
    width: 90%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;

    .info-item {
      font-size: 20px;
      width: 100%;
      height: 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      margin: 10px;
      border-radius: 10px;
      background-color: #333;
      padding: 10px;
    }
  }
}
</style>
