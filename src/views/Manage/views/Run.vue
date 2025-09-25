<template>
  <div class="run-container" @keydown.enter="getRunByUser">
    <div class="filter-bar">
      <SearchSelect
        v-model="nickname"
        :options="userList"
        option-key="id"
        option-label="nickname"
        :search-fields="['nickname']"
        placeholder="请选择用户"
        @select="handleUserSelect"
      />
      <PrimaryButton @click="getRunByUser">确定</PrimaryButton>
    </div>
    <div class="run-cards">
      <RunCard
        v-for="item in runData"
        :key="item.id"
        :id="item.id"
        :nickname="nickname"
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
import SearchSelect from '@/components/common/SearchSelect.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import { ref, onMounted, computed } from 'vue';
import { useStatsStore } from '@/stores/stats';
import { supabase } from '@/lib/supabaseClient';
import { showErrorNotification } from '@/utils/notification';

const statsStore = useStatsStore();
const runData = ref<any[]>([]);
const isLoading = computed(() => statsStore.isLoading);
const userList = ref<any[]>([]);
const nickname = ref<any>('');

const getUserList = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    showErrorNotification('网络错误，获取用户列表失败');
    return;
  }
  userList.value = data.map((user) => ({
    id: user.id,
    nickname: user.nickname,
  }));
};

onMounted(() => {
  getUserList();
});

const handleUserSelect = (user: any) => {
  nickname.value = user.nickname;
  runData.value = [];
  getRunByUser();
};

const getRunByUser = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*,runs(*)')
    .eq('nickname', nickname.value);
  if (error) {
    showErrorNotification('网络错误，获取成绩失败');
    return;
  }
  runData.value = data[0].runs;
};
</script>

<style scoped>
.run-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-bar {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: center;
}

.run-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
