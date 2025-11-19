<template>
  <div class="stats" @click="handleClick">
    <div class="new-record-cell" v-if="isNewRecord">NEW</div>
    <div class="rank-cell">
      <img :src="rankPlaceIconSrc(rank)" alt="rank" class="rank-icon" v-if="rank <= 3" />
      <span v-else>{{ rank }}</span>
    </div>
    <div class="player-cell" v-html="safeDisplay(nickname)" @click.stop="navToUserProfile"></div>
    <div class="igt-cell" v-html="safeDisplay(igt)"></div>
    <div class="date-cell" v-html="safeDisplay(date)"></div>
    <div class="video-cell">
      <a
        :href="videolink"
        target="_blank"
        @click.stop
        @click.prevent="handleVideoClick"
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
// 导入排名图标
import firstPlaceIcon from '@/assets/icons/firstplace.png';
import secondPlaceIcon from '@/assets/icons/secondplace.png';
import thirdPlaceIcon from '@/assets/icons/thirdplace.png';
import { computed } from 'vue';

// 定义 props
interface Props {
  rank: number;
  nickname: string;
  userId: number;
  igt: string;
  date: string;
  videolink: string;
  runId: number;
  is_new_record: boolean;
}

const props = defineProps<Props>();

const router = useRouter();

// 定义 emits
const emit = defineEmits<{
  click: [runId: number];
  videoClick: [url: string];
}>();

// 处理点击事件
const handleClick = () => {
  emit('click', props.runId);
};

// 跳转至用户空间
const navToUserProfile = () => {
  router.push(`/profile/${props.userId}`);
};

// 处理视频点击事件
const handleVideoClick = () => {
  emit('videoClick', props.videolink);
};

// 获取排名图标
const rankPlaceIconSrc = (rank: number) => {
  if (rank === 1) {
    return firstPlaceIcon;
  } else if (rank === 2) {
    return secondPlaceIcon;
  } else if (rank === 3) {
    return thirdPlaceIcon;
  }
  return '';
};

// 判断是否为30天内的新成绩
const isNewRecord = computed(() => {
  return props.is_new_record;
});
</script>

<style scoped>
.stats {
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #444;
  display: flex;
  position: relative;
}

.stats:hover {
  background-color: #3a3a3a;
  transform: translateY(-1px);
}

.stats:last-child {
  border-bottom: none;
}

.stats > div {
  flex: 1;
  padding: 16px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-record-cell {
  position: absolute;
  left: 0;
  top: 0;
  color: #00bcd4;
  font-weight: 600;
  font-size: 0.8em;
  transform: rotate(-45deg);
}

.rank-icon {
  width: 30px;
  height: 30px;
}

.rank-cell {
  font-weight: 600;
  color: #00bcd4;
}

.player-cell {
  font-weight: 500;
  font-size: 1.2em;
}

.igt-cell {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.2em;
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
  .stats > div {
    padding: 12px 6px;
    font-size: 0.9em;
  }
}
</style>
