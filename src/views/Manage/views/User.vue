<template>
  <div class="user-container">
    <div class="binding-section">
      <h4 class="section-subtitle">创建新用户</h4>
      <div class="form-row">
        <input
          type="text"
          class="form-input"
          placeholder="请输入新用户的昵称"
          v-model="newUserNickname"
          autocomplete="off"
        />
        <button class="form-button" @click="handleNewUserCreate">创建</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import useUserStore from '@/stores/user';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';

const userStore = useUserStore();
const router = useRouter();
const newUserNickname = ref('');

const handleNewUserCreate = async () => {
  if (!newUserNickname.value) {
    alert('请输入昵称');
    return;
  }
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({ nickname: newUserNickname.value })
      .select();
    if (error) {
      console.error(error);
    } else {
      alert('创建成功');
    }
  } catch (error) {
    console.error(error);
  }
  router.go(0);
};
</script>

<style scoped>
.binding-section {
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

.form-input,
.form-select {
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

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.form-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.form-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.form-button:active {
  transform: translateY(0);
}
</style>
