<template>
  <div class="profile-container">
    <div class="profile-line">
      <div class="skin-container">
        <img :src="userSkinUrl" />
      </div>
      <div class="profile-info">
        <BaseInfoItem label="昵称" :value="userInfo.nickname" />
        <BaseInfoItem label="IGN" :value="userInfo.ingamename" />
      </div>
    </div>
    <div class="profile-line">
      <PacemanCard :ingamename="userInfo.ingamename" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';

import BaseInfoItem from './components/BaseInfoItem.vue';
import PacemanCard from './components/PacemanCard.vue';

const route = useRoute();
const id = route.params.id;

const userInfo = ref<any>({});

const getUserInfo = async () => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  userInfo.value = data;
};

const userSkinUrl = computed(() => {
  if (userInfo.value.ingamename) {
    return `https://render.crafty.gg/3d/full/${userInfo.value.ingamename}`;
  }
  return '';
});

onMounted(() => {
  getUserInfo();
});
</script>

<style scoped>
.profile-container {
  margin-top: 20px;
  width: 80%;
  height: 80%;
  display: flex;
}

.profile-line {
  width: 100%;
  display: flex;
  gap: 5rem;
}

.profile-info {
  display: flex;
  flex-direction: column;
}
</style>
