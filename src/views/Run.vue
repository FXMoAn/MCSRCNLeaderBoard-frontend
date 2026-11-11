<template>
  <div class="content">
    <Loading v-if="!runInfo" />
    <div v-else class="content">
      <div v-if="getPlayerUrl" class="video-container">
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

      <a
        v-if="videoUrl"
        :href="videoUrl"
        class="original-video-link"
        target="_blank"
        rel="noopener noreferrer"
        >观看原视频 ↗</a
      >

      <!-- 简介 -->
      <section class="desc-panel">
        <h2 class="panel-label">简介</h2>
        <p class="desc-text">{{ runInfo.remarks || '无' }}</p>
      </section>

      <!-- 三列明细：项目 / 成绩 / 玩家 -->
      <div class="detail-columns">
        <section class="detail-col">
          <h2 class="col-title">项目</h2>
          <div class="info-card">
            <span class="card-label">类别</span>
            <span class="card-value">Any%</span>
          </div>
          <div class="info-card">
            <span class="card-label">种子类型</span>
            <span class="card-value">{{ runInfo.type }}</span>
          </div>
          <div class="info-card">
            <span class="card-label">版本范围</span>
            <span class="card-value">{{ versionRange }}</span>
          </div>
          <div class="info-card">
            <span class="card-label">版本</span>
            <span class="card-value">{{ runInfo.version }}</span>
          </div>
        </section>

        <section class="detail-col">
          <h2 class="col-title">成绩</h2>
          <div class="info-card">
            <span class="card-label">排名</span>
            <span class="card-value rank-value">{{ rankText }}</span>
          </div>
          <div class="info-card">
            <span class="card-label">IGT（游戏内时间）</span>
            <span class="card-value igt-value">{{ runInfo.igt }}</span>
          </div>
          <div class="info-card">
            <span class="card-label">日期</span>
            <span class="card-value">{{ formatRunDate(runInfo.date) }}</span>
          </div>
        </section>

        <section class="detail-col">
          <h2 class="col-title">玩家</h2>
          <div class="info-card player-card">
            <span class="card-label">玩家</span>
            <RouterLink :to="`/profile/${runInfo.userid}`" class="player-link">{{
              runInfo.users?.nickname
            }}</RouterLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatRunDate } from '@/utils/date';
import { validateVideoLink } from '@/utils/security';
import { VERSION_RANGE_OPTIONS } from '@/constants/common';
import { useRoute } from 'vue-router';
import { RouterLink } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { onBeforeMount, ref, computed } from 'vue';
import { extractBVId, buildPlayerUrl } from '@/utils/bilibili';
import type { RunInfo } from '@/types/CommonTypes';
import Loading from '@/components/common/Loading.vue';

const route = useRoute();
const id = route.params.id;

const runInfo = ref<RunInfo>();
// 该成绩在其分类（已验证）榜单中的名次；非验证状态或查询失败时为 null。
const rank = ref<number | null>(null);

const getRunInfo = async () => {
  try {
    const { data, error } = await supabase.from('runs').select(`*,users(*)`).eq('id', id);
    if (error) {
      console.error(error);
    } else {
      runInfo.value = data[0];
      await fetchRank();
    }
  } catch (error) {
    console.error(error);
  }
};

const fetchRank = async () => {
  const run = runInfo.value;
  if (!run || run.status !== 'verified') return;
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_version: run.version,
      p_type: run.type,
      p_status: 'verified',
    });
    if (error) throw error;
    const index = (data ?? []).findIndex((item: { run_id: number }) => item.run_id === run.id);
    if (index >= 0) rank.value = index + 1;
  } catch (error) {
    console.error('get_leaderboard error', error);
  }
};

const versionRange = computed(() => {
  const run = runInfo.value;
  return (
    VERSION_RANGE_OPTIONS[run?.type ?? '']?.find((option) => option.value === run?.version)
      ?.label ??
    run?.version ??
    '—'
  );
});
const videoUrl = computed(() => {
  const link = runInfo.value?.videolink ?? '';
  return validateVideoLink(link).isValid ? link.trim() : '';
});
const rankText = computed(() => (rank.value !== null ? `第 ${rank.value} 名` : '—'));

const getBVId = computed(() => {
  return extractBVId(runInfo.value?.videolink || '');
});

const getPlayerUrl = computed(() => {
  const bvid = getBVId.value;
  if (!bvid) return '';

  return buildPlayerUrl(bvid, { isOutside: true, autoplay: false });
});

onBeforeMount(() => {
  getRunInfo();
});
</script>

<style scoped>
.original-video-link {
  align-self: flex-start;
  color: var(--accent-bright);
  padding: 8px 0;
}

.original-video-link:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 3px;
}

.content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
  gap: 16px;
  box-sizing: border-box;
  overflow-x: hidden;
}

.video-container {
  width: 100%;
  max-width: 1000px;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  box-sizing: border-box;
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* ---- 简介 ---- */
.desc-panel {
  width: 100%;
  max-width: 1000px;
  box-sizing: border-box;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 14px 18px;
}

.panel-label {
  margin: 0 0 6px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.desc-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ---- 三列明细 ---- */
.detail-columns {
  width: 100%;
  max-width: 1000px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}

.detail-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.col-title {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.info-card:hover {
  border-color: var(--border-light);
}

.card-label {
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
}

.card-value {
  color: var(--text-secondary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-value.muted {
  color: var(--text-muted);
}

.rank-value {
  color: var(--accent-bright);
  font-weight: 600;
}

.igt-value {
  color: var(--accent-bright);
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 16px;
}

.player-card .player-link {
  color: var(--accent-bright);
  font-size: 15px;
  font-weight: 600;
  min-width: 0;
  overflow-wrap: anywhere;
}

.player-card .player-link:hover {
  text-decoration: underline;
}

@media (max-width: 860px) {
  .detail-columns {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 15px;
    gap: 12px;
  }

  .video-container {
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .info-card {
    transition: none;
  }
}
</style>
