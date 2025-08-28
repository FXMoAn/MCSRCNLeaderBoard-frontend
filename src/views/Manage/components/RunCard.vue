<template>
  <div class="run-card" @click="navToRunDetail(props.id)">
    <div class="player-cell" v-html="safeDisplay(props.nickname)"></div>
    <div class="version-cell info-cell">{{ props.version }}</div>
    <div class="type-cell info-cell">{{ props.type }}</div>
    <div class="date-cell info-cell">{{ props.date }}</div>
    <div class="igt-cell" v-html="safeDisplay(props.igt)"></div>
    <div class="video-cell">
      <a
        :href="props.videolink"
        target="_blank"
        @click.stop
        @click.prevent="openVideo(props.videolink)"
        class="video-link"
      >
        <SvgIcon name="vedio" color="white"></SvgIcon>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { safeDisplay } from '@/utils/security';
import SvgIcon from '@/components/icons/index.vue';
import { useRouter } from 'vue-router';

interface Props {
  id: number;
  nickname: string;
  version: string;
  type: string;
  date: string;
  igt: string;
  videolink: string;
}

const router = useRouter();

const props = defineProps<Props>();

// 跳转至详情页
const navToRunDetail = (id: number) => {
  router.push(`/pending-run/${id}`);
};

// 打开视频链接
const openVideo = (url: string) => {
  window.open(url, '_blank');
};
</script>

<style scoped>
.run-card {
  width: 100%;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
  cursor: pointer;
}

.info-cell {
  font-size: 14px;
}

.player-cell {
  font-weight: 500;
}

.igt-cell {
  font-family: 'Courier New', monospace;
  font-weight: 600;
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
</style>
