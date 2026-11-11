<template>
  <div class="profile-container">
    <div v-if="profileLoading && !userInfo.id" class="profile-feedback"><Loading /></div>
    <div v-else-if="profileError" class="profile-feedback" role="status">
      <span>{{ profileError }}</span>
      <PrimaryButton variant="clear" @click="loadProfile">重试</PrimaryButton>
    </div>
    <template v-if="userInfo.id">
      <!-- 皮肤和基本信息 -->
      <div class="profile-header">
        <div class="skin-container">
          <img :src="userSkinUrl" class="skin-image" />
        </div>

        <div class="profile-info">
          <BaseInfoItem label="昵称" :value="userInfo.nickname" />
          <BaseInfoItem label="IGN" :value="userInfo.ingamename" />
          <BaseInfoItem label="个人链接" :value="userInfo.space_link" />
          <BaseInfoItem label="直播间链接" :value="userInfo.liveroom_link" />
        </div>
      </div>

      <!-- 速通成绩 -->
      <div class="profile-run">
        <div class="profile-run-title">速通成绩</div>
        <div class="profile-run-cards">
          <RunCard
            v-for="item in runData"
            :key="item.id"
            :id="item.id"
            :nickname="item.nickname"
            :version="item.version"
            :type="item.type"
            :date="item.date"
            :igt="item.igt"
            :videolink="item.videolink"
            :status="item.status"
          />
        </div>
      </div>

      <!-- PacemanCard和其他内容 -->
      <div class="profile-content">
        <div class="profile-left">
          <PacemanCard :profile-id="userInfo.id" :ingamename="userInfo.ingamename" />
        </div>
        <div class="profile-right">
          <RankedCard :profile-id="userInfo.id" :ingamename="userInfo.ingamename" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onScopeDispose, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import Loading from '@/components/common/Loading.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';

import BaseInfoItem from './components/BaseInfoItem.vue';
import PacemanCard from './components/PacemanCard.vue';
import RankedCard from './components/RankedCard.vue';
import RunCard from '../Space/components/RunCard.vue';

const route = useRoute();
const userInfo = ref<any>({});
const runData = ref<any[]>([]);
const profileLoading = ref(false);
const profileError = ref('');
let generation = 0;
let controller: AbortController | undefined;

const userSkinUrl = computed(() => {
  if (userInfo.value.ingamename) {
    return `https://render.crafty.gg/2d/head/${encodeURIComponent(userInfo.value.ingamename)}`;
  }
  return '';
});

const loadProfile = async () => {
  const version = ++generation;
  controller?.abort();
  const activeController = new AbortController();
  controller = activeController;
  const timeout = setTimeout(() => activeController.abort(), 15_000);
  profileLoading.value = true;
  profileError.value = '';
  userInfo.value = {};
  runData.value = [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id,nickname,ingamename,space_link,liveroom_link,runs(*)')
      .eq('id', route.params.id)
      .abortSignal(activeController.signal)
      .maybeSingle();
    if (version !== generation) return;
    if (error) throw error;
    if (!data) {
      profileError.value = '未找到该玩家';
      return;
    }
    userInfo.value = data;
    runData.value = (data.runs ?? []).filter((item: any) => item.status === 'verified');
  } catch {
    if (version === generation) profileError.value = '个人主页加载失败，请重试';
  } finally {
    clearTimeout(timeout);
    if (version === generation) profileLoading.value = false;
  }
};
watch(() => route.params.id, loadProfile, { immediate: true });
onScopeDispose(() => {
  generation++;
  controller?.abort();
});
</script>

<style scoped>
.profile-feedback {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #b5c2b9;
}
.profile-container {
  width: 90%;
  max-width: 1200px;
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 32px;
  padding: 24px;
  background-color: #333;
  border-radius: 8px;
  border: 1px solid #555;
}

.skin-container {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #444;
  border-radius: 8px;
  border: 1px solid #555;
  overflow: hidden;
}

.skin-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skin-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.skin-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.profile-left {
  min-height: 300px;
}

.profile-right {
  min-height: 300px;
}

.profile-run {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-run-title {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.profile-run-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.placeholder-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
  border-radius: 8px;
  border: 1px solid #555;
  color: #999;
}

.placeholder-content p {
  margin: 0;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-container {
    width: 95%;
    margin: 16px auto;
    gap: 16px;
  }

  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 20px;
    padding: 20px;
  }

  .skin-container {
    width: 100px;
    height: 100px;
  }

  .profile-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .profile-left,
  .profile-right {
    min-height: 250px;
  }
}

@media (max-width: 480px) {
  .profile-header {
    padding: 16px;
  }

  .skin-container {
    width: 80px;
    height: 80px;
  }
}
</style>
