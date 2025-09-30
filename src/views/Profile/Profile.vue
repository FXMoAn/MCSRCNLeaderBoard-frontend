<template>
  <div class="profile-container">
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
        <PacemanCard :ingamename="userInfo.ingamename" />
      </div>
      <div class="profile-right">
        <!-- 预留位置给其他内容 -->
        <div class="placeholder-content">
          <p>开发中</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { showErrorNotification } from '@/utils/notification';

import BaseInfoItem from './components/BaseInfoItem.vue';
import PacemanCard from './components/PacemanCard.vue';
import RunCard from '../Space/components/RunCard.vue';

const route = useRoute();
const id = route.params.id;

const userInfo = ref<any>({});
const isSkinLoading = ref(false);

const getUserInfo = async () => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  userInfo.value = data;
};

const userSkinUrl = computed(() => {
  if (userInfo.value.ingamename) {
    return `https://render.crafty.gg/2d/head/${userInfo.value.ingamename}`;
  }
  return '';
});

// 监听用户名变化，重新加载皮肤
watch(
  () => userInfo.value.ingamename,
  (newIngamename) => {
    if (newIngamename) {
      isSkinLoading.value = true;
    } else {
      isSkinLoading.value = false;
    }
  },
  { immediate: true }
);

const runData = ref<any[]>([]);

const getRunByUser = async (nickname: string) => {
  const { data, error } = await supabase.from('users').select('*,runs(*)').eq('nickname', nickname);
  if (error) {
    showErrorNotification('网络错误，获取成绩失败');
    return;
  }
  runData.value = data[0].runs.filter((item: any) => item.status === 'verified');
};

onMounted(() => {
  getUserInfo().then((res) => {
    getRunByUser(userInfo.value.nickname);
  });
});
</script>

<style scoped>
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
