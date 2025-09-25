<template>
  <div class="reset-password-container">
    <div class="form-card">
      <div class="form-title">重置密码</div>
      <form class="reset-password-form" @submit.prevent="handleResetPassword">
        <div class="form-group">
          <label for="new-password" class="form-label">新密码</label>
          <input
            class="form-input"
            type="password"
            id="new-password"
            v-model="newPassword"
            placeholder="请输入新密码"
            required
          />
        </div>
        <div class="form-group">
          <label for="confirm-password" class="form-label">确认密码</label>
          <input
            class="form-input"
            type="password"
            id="confirm-password"
            v-model="confirmPassword"
            placeholder="请确认新密码"
            required
          />
        </div>
        <button class="submit-button" type="submit" :disabled="loading">
          {{ loading ? '重置中...' : '重置密码' }}
        </button>
      </form>
      <div class="login-link">
        <span>密码重置成功？</span>
        <a href="/login">去登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import useAuthStore from '@/stores/auth';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import { showErrorNotification, showSuccessNotification } from '@/utils/notification';

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const checkPassword = () => {
  if (newPassword.value !== confirmPassword.value) {
    showErrorNotification('密码不一致');
    return false;
  }
  if (newPassword.value.length < 6) {
    showErrorNotification('密码长度至少6位');
    return false;
  }
  return true;
};

const router = useRouter();

const handleReset = async () => {
  const { error } = await supabase.auth.updateUser({ password: newPassword.value });
  if (error) return showErrorNotification(error.message);
  showSuccessNotification('密码已重置，请重新登录');
  await supabase.auth.signOut();
  router.replace('/login');
};

const handleResetPassword = async () => {
  if (checkPassword()) {
    loading.value = true;
    try {
      await handleReset();
    } finally {
      loading.value = false;
    }
  }
};

onMounted(async () => {
  // 当用户通过邮件进来时，URL 中带有 access_token，Supabase 会自动把 session 换好
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    showErrorNotification('链接已失效，请重新申请');
    router.replace('/login');
  }
});
</script>

<style scoped>
.reset-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 20px;
  background-color: var(--bgcolor);
}

.form-card {
  background-color: #333;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border: 1px solid #444;
}

.form-title {
  text-align: center;
  margin-bottom: 32px;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
}

.reset-password-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #ccc;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 16px;
  background-color: #222;
  border: 2px solid #444;
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #666;
}

.form-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.1);
}

.submit-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
}

.submit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 188, 212, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-link {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #444;
  color: #999;
  font-size: 14px;
}

.login-link a {
  color: #00bcd4;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.login-link a:hover {
  color: #00acc1;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .form-card {
    padding: 24px;
    margin: 16px;
  }

  .form-title {
    font-size: 24px;
  }
}
</style>
