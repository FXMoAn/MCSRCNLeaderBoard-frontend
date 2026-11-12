<template>
  <div class="run-container">
    <div v-if="loading" class="run-cards">
      <Loading />
    </div>
    <div v-else-if="error" class="run-state" role="alert">
      <p>{{ error }}</p>
      <PrimaryButton @click="getRunByUser">重新加载</PrimaryButton>
    </div>
    <div v-else-if="!runData.length" class="run-state">
      <p>暂无成绩</p>
      <RouterLink to="/user-upload" class="upload-link">上传成绩</RouterLink>
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
import { ref, computed, watch, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { useUserStore } from '@/stores';
import PrimaryButton from '@/components/common/PrimaryButton.vue';

const userStore = useUserStore();
const runData = ref<any[]>([]);
const userInfo = computed(() => userStore.userInfo);
const loading = ref(false);
const error = ref('');
let request = 0;

async function getRunByUser() {
  const version = ++request;
  const profileId = userInfo.value.id;
  runData.value = [];
  error.value = '';
  if (!profileId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await supabase
      .from('runs')
      .select('*')
      .eq('userid', profileId)
      .order('id', { ascending: false })
      .abortSignal(AbortSignal.timeout(15_000));
    if (version !== request) return;
    if (result.error) throw result.error;
    runData.value = result.data ?? [];
  } catch {
    if (version === request) error.value = '成绩暂时无法加载，请重试';
  } finally {
    if (version === request) loading.value = false;
  }
}
watch(() => userInfo.value.id, getRunByUser, { immediate: true });
onUnmounted(() => {
  request++;
});
</script>

<style scoped>
.run-container {
  box-sizing: border-box;
  width: 100%;
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  border-radius: 10px;
  padding: 20px;
}
.run-state {
  width: 100%;
  display: grid;
  justify-items: center;
  gap: 20px;
  padding: 32px 0;
}
.run-state p {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-secondary);
}
.upload-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 0 20px;
  border-radius: 8px;
  background: var(--accent-dark);
  font-size: 14px;
}
.upload-link:hover {
  background: var(--accent-strong);
  color: var(--text-primary);
}
.upload-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.run-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
