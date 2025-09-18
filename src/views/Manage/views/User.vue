<template>
  <div class="user-container">
    <div class="operation-section">
      <div class="section-subtitle">创建新用户</div>
      <div class="form-row">
        <input
          type="text"
          class="form-input"
          placeholder="请输入新用户的昵称"
          v-model="newUserNickname"
          autocomplete="off"
        />
        <PrimaryButton @click="handleNewUserCreate">创建</PrimaryButton>
      </div>
    </div>
    <div class="operation-section">
      <div class="section-subtitle">修改用户名</div>
      <div class="form-row">
        <SearchSelect
          v-model="oldNickname"
          :options="userList"
          option-key="id"
          option-label="nickname"
          :search-fields="['nickname']"
          placeholder="请选择用户"
          @select="handleUserSelect"
        />
        <input
          type="text"
          class="form-input"
          placeholder="请输入新用户名"
          v-model="newNickname"
          autocomplete="off"
        />
        <PrimaryButton @click="handleUserUpdate">修改</PrimaryButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import useUserStore from '@/stores/user';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { validateNickname, sanitizeInput } from '@/utils/security';
import SearchSelect from '@/components/common/SearchSelect.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';

const userStore = useUserStore();
const router = useRouter();
// 创建新用户
const newUserNickname = ref('');

// 修改用户名
const userList = ref<any[]>([]);
const oldNickname = ref('');
const newNickname = ref('');

const handleNewUserCreate = async () => {
  // 使用安全工具函数进行输入验证
  const validation = validateNickname(newUserNickname.value);

  if (!validation.isValid) {
    alert(validation.message);
    return;
  }

  // 清理输入
  const sanitizedNickname = sanitizeInput(newUserNickname.value.trim());

  try {
    const { data, error } = await supabase
      .from('users')
      .insert({ nickname: sanitizedNickname })
      .select();
    if (error) {
      console.error(error);
      alert('创建失败，请重试');
    } else {
      alert('创建成功');
      newUserNickname.value = ''; // 清空输入
    }
  } catch (error) {
    console.error(error);
    alert('创建失败，请重试');
  }
  router.go(0);
};

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

const handleUserSelect = (user: any) => {
  oldNickname.value = user.nickname;
};

const handleUserUpdate = async () => {
  const { data, error } = await supabase
    .from('users')
    .update({ nickname: newNickname.value })
    .eq('nickname', oldNickname.value);
  if (error) {
    alert('修改失败');
    return;
  }
  alert('修改成功');
  router.go(0);
};

onMounted(() => {
  getUserList();
});
</script>

<style scoped>
.operation-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid #444;
}

.section-subtitle {
  color: #ccc;
  font-size: 1.1em;
  font-weight: 500;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.form-input {
  flex: 1;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #666;
}

.form-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}
</style>
