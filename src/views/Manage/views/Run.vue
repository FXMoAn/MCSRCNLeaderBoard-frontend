<template>
  <div class="run-container">
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
      <button class="submit-button" @click="getRunByUser">确定</button>
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
import { ref, onMounted, computed } from 'vue';
import { useStatsStore } from '@/stores/stats';
import { supabase } from '@/lib/supabaseClient';

const statsStore = useStatsStore();
const runData = ref<any[]>([]);
const isLoading = computed(() => statsStore.isLoading);
const userList = ref<any[]>([]);
const nickname = ref<any>('');

const getUserList = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    alert('获取用户列表失败');
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
};

const getRunByUser = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*,runs(*)')
    .eq('nickname', nickname.value);
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

.submit-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.submit-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button:disabled {
  background: linear-gradient(135deg, #666, #555);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.submit-button.submitting {
  background: linear-gradient(135deg, #0097a7, #00695f);
  cursor: wait;
}

.submit-button.submitting:hover {
  transform: none;
  box-shadow: none;
}
</style>
