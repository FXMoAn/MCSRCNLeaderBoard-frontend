<template>
  <div class="profile-container">
    <div class="skin-container">
      <img :src="userSkinUrl" alt="skin" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';

const route = useRoute();
const id = route.params.id;

const userInfo = ref<any>({});

const getUserInfo = async () => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  userInfo.value = data;
};

const userSkinUrl = computed(() => {
  return `https://render.crafty.gg/3d/full/${userInfo.value.ingamename}`;
});

onMounted(() => {
  getUserInfo();
});
</script>

<style scoped>
.profile-container {
  width: 80%;
  height: 80%;
  display: flex;
}

.skin-container {
  width: 20%;
  height: 20%;
}
</style>
