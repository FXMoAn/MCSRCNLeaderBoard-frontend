<template>
  <div class="stats" @click="handleClick">
    <span class="new-record-cell" v-if="isNewRecord">NEW</span>
    <div class="cell rank-cell">
      <img
        :src="rankPlaceIconSrc(rank)"
        :alt="`第 ${rank} 名`"
        class="rank-icon"
        v-if="rank <= 3"
      />
      <span v-else>{{ rank }}</span>
    </div>
    <div class="cell player-cell">
      <RouterLink :to="`/profile/${userId}`" class="player-link" @click.stop>{{
        nickname
      }}</RouterLink>
      <span class="new-record-badge" v-if="isNewRecord">NEW</span>
    </div>
    <div class="cell igt-cell">
      <RouterLink
        :to="`/run/${runId}`"
        :aria-label="`${nickname} 的成绩 ${igt}，查看详情`"
        @click.stop
        >{{ igt }}</RouterLink
      >
    </div>
    <div class="cell date-cell">{{ date }}</div>
    <div class="cell video-cell">
      <a
        v-if="videolink"
        :href="videolink"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`${nickname} 的记录视频`"
        @click.stop.prevent="handleVideoClick"
        class="video-link"
      >
        <SvgIcon name="vedio" color="white"></SvgIcon>
      </a>
      <span v-else class="no-video">暂无视频</span>
    </div>
    <details class="mobile-details" @click.stop>
      <summary>日期与视频 <span class="details-chevron" aria-hidden="true">⌄</span></summary>
      <div class="details-content">
        <span class="record-date"
          >记录时间 <span>{{ date }}</span></span
        >
        <a
          v-if="videolink"
          :href="videolink"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${nickname} 的记录视频`"
          @click.prevent="handleVideoClick"
          >观看视频 ↗</a
        >
        <span v-else class="no-video">暂无视频</span>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from '@/components/icons/index.vue';
import { RouterLink } from 'vue-router';
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

// 定义 emits
const emit = defineEmits<{
  click: [runId: number];
  videoClick: [url: string];
}>();

// 处理点击事件
const handleClick = () => {
  emit('click', props.runId);
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

.cell {
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

.player-link {
  min-width: 0;
  overflow-wrap: anywhere;
}

.stats a {
  color: inherit;
  text-decoration: none;
}

.stats a:hover {
  color: #00bcd4;
}

.stats a:focus-visible,
.mobile-details summary:focus-visible {
  outline: 2px solid #00bcd4;
  outline-offset: 3px;
  border-radius: 4px;
}

.new-record-badge,
.mobile-details {
  display: none;
}

.igt-cell {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.2em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.date-cell {
  color: #ccc;
  font-size: 0.9em;
}

.video-cell {
  width: 60px;
}

.no-video {
  color: #ccc;
  font-size: 12px;
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
  .stats {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) 112px;
    column-gap: 8px;
    padding: 0 12px;
  }

  .stats:hover {
    transform: none;
  }

  .cell {
    min-width: 0;
    padding: 16px 0 4px;
    font-size: 14px;
  }

  .player-cell {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .igt-cell {
    font-size: 15px;
  }

  .rank-icon {
    width: 26px;
    height: 26px;
  }

  .date-cell,
  .video-cell,
  .new-record-cell {
    display: none;
  }

  .new-record-badge {
    display: inline-flex;
    color: #00bcd4;
    font-size: 10px;
    font-weight: 600;
  }

  .mobile-details {
    display: block;
    grid-column: 1 / -1;
    min-width: 0;
    font-size: 12px;
    text-align: left;
    cursor: auto;
  }

  .mobile-details summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    color: #ccc;
    cursor: pointer;
    list-style: none;
  }

  .mobile-details summary::-webkit-details-marker {
    display: none;
  }

  .details-chevron {
    font-size: 16px;
  }

  .mobile-details[open] .details-chevron {
    transform: rotate(180deg);
  }

  .details-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 4px 0 12px;
    color: #ccc;
  }

  .record-date {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .details-content a {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    color: #00bcd4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stats,
  .video-link {
    transition: none;
  }
}
</style>
