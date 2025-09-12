<template>
  <div class="run-container">
    <div v-if="!runData.length" class="run-cards">
      <Loading />
    </div>
    <div v-else class="run-cards">
      <RunCard
        v-for="item in runData"
        :key="item.id"
        :id="item.id"
        :nickname="userInfo.nickname"
        :igt="item.igt"
        :videolink="item.videolink"
        :version="item.version"
        :type="item.type"
        :date="item.date"
        :status="item.status"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import RunCard from '../components/RunCard.vue';
import Loading from '@/components/common/Loading.vue';
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/stores';

const userStore = useUserStore();
const runData = ref<any[]>([]);
const userInfo = computed(() => userStore.userInfo);

onMounted(() => {
  getRunByUser();
});

const getRunByUser = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*,runs(*)')
    .eq('nickname', userInfo.value.nickname);
  if (error) {
    alert('获取成绩失败');
    return;
  }
  runData.value = data[0].runs;
};
</script>

<style scoped>
.run-container {
  width: 100%;
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  border-radius: 10px;
  padding: 20px;
}

.run-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
