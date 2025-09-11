<template>
  <div class="content">
    <Loading v-if="!runInfo" />
    <div v-else class="content">
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
        <div class="info-title">记录详情</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">玩家</span>
            <input
              v-model="runInfo.users.nickname"
              :placeholder="runInfo.users.nickname"
              class="info-value"
              type="text"
              disabled
            />
          </div>
          <div class="info-item">
            <span class="info-label">日期</span>
            <input
              v-model="runInfo.date"
              :placeholder="runInfo.date"
              class="info-value"
              type="text"
              :disabled="!isEditing"
            />
          </div>
          <div class="info-item">
            <span class="info-label">IGT</span>
            <input
              v-model="runInfo.igt"
              :placeholder="runInfo.igt"
              class="info-value"
              type="text"
              :disabled="!isEditing"
            />
          </div>
          <div class="info-item">
            <span class="info-label">版本</span>
            <input
              v-model="runInfo.version"
              :placeholder="runInfo.version"
              class="info-value"
              type="text"
              :disabled="!isEditing"
            />
          </div>
          <div class="info-item">
            <span class="info-label">类型</span>
            <input
              v-model="runInfo.type"
              :placeholder="runInfo.type"
              class="info-value"
              type="text"
              :disabled="!isEditing"
            />
          </div>
          <div class="info-item">
            <span class="info-label">种子</span>
            <input
              v-model="runInfo.seed"
              :placeholder="runInfo.seed || '无'"
              class="info-value"
              type="text"
              :disabled="!isEditing"
            />
          </div>
          <div class="info-item" @click="openVideoLink">
            <span class="info-label">视频链接</span>
            <input
              v-model="runInfo.videolink"
              :placeholder="runInfo.videolink"
              class="info-value"
              type="text"
              :disabled="!isEditing"
              @click.stop
            />
          </div>
          <div class="info-item">
            <span class="info-label">备注</span>
            <textarea
              v-model="runInfo.remarks"
              :placeholder="runInfo.remarks || '无'"
              class="info-value"
              :disabled="!isEditing"
            />
          </div>
        </div>
      </div>
      <div class="action-container">
        <button
          class="action-button verify-button"
          @click="verifyRun"
          :disabled="isSubmitting"
          v-show="runInfo.status !== 'verified'"
        >
          <span v-if="!isSubmitting">通过</span>
          <span v-else>操作中...</span>
        </button>
        <button
          class="action-button reject-button"
          @click="rejectRun"
          :disabled="isSubmitting"
          v-show="runInfo.status !== 'rejected'"
        >
          <span v-if="!isSubmitting">拒绝</span>
          <span v-else>操作中...</span>
        </button>
        <button v-if="isEditing" class="action-button edit-button" @click="saveRun">保存</button>
        <button v-else class="action-button edit-button" @click="editRun">编辑</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { onBeforeMount, ref, computed } from 'vue';
import { extractBVId, buildPlayerUrl } from '@/utils/bilibili';
import type { RunInfo } from '@/types/CommonTypes';
import Loading from '@/components/common/Loading.vue';

const route = useRoute();
const id = route.params.id;
const router = useRouter();
const runInfo = ref<RunInfo>();
const isEditing = ref(false);
const isSubmitting = ref(false);

const verifyRun = async () => {
  try {
    isSubmitting.value = true;
    const { data, error } = await supabase
      .from('runs')
      .update({
        igt: runInfo.value?.igt,
        date: runInfo.value?.date,
        version: runInfo.value?.version,
        type: runInfo.value?.type,
        seed: runInfo.value?.seed,
        remarks: runInfo.value?.remarks,
        videolink: runInfo.value?.videolink,
        status: 'verified',
      })
      .eq('id', id);
    if (error) {
      console.error(error);
      alert('通过失败' + error.message);
    } else {
      console.log('verifyRun success', data);
      alert('通过成功');
      router.push('/manage/verify');
    }
  } catch (error) {
    console.error(error);
  } finally {
    isSubmitting.value = false;
  }
};

const rejectRun = async () => {
  try {
    isSubmitting.value = true;
    const { data, error } = await supabase
      .from('runs')
      .update({
        status: 'rejected',
        remarks: runInfo.value?.remarks,
      })
      .eq('id', id);
    if (error) {
      console.error(error);
      alert('拒绝失败' + error.message);
    } else {
      console.log('rejectRun success', data);
      alert('拒绝成功');
      router.push('/manage/verify');
    }
  } catch (error) {
    console.error(error);
  } finally {
    isSubmitting.value = false;
  }
};

const saveRun = () => {
  isEditing.value = false;
};

const editRun = () => {
  isEditing.value = true;
};

const openVideoLink = () => {
  if (isEditing.value) return;
  window.open(runInfo.value?.videolink, '_blank');
};

const getRunInfo = async () => {
  try {
    const { data, error } = await supabase.from('runs').select(`*,users(*)`).eq('id', id);
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

.info-grid .info-item:nth-child(7),
.info-grid .info-item:nth-child(8) {
  grid-column: 1 / -1;
}

.info-grid .info-item:nth-child(7) .info-value,
.info-grid .info-item:nth-child(8) .info-value {
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
  background-color: transparent;
  border: none;
  outline: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.info-value:not([disabled]) {
  background-color: #333;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.igt-value {
  color: #00bcd4;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.4em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-container {
  display: flex;
  gap: 10px;
}

.verify-button {
  background-color: #4caf50;
}

.reject-button {
  background-color: #f44336;
}

.edit-button {
  background-color: #00bcd4;
}

.action-button {
  padding: 10px 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}

.action-button:hover {
  opacity: 0.8;
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
