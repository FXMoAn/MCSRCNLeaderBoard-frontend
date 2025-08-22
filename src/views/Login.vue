<template>
  <div class="login-container">
    <div class="form-card">
      <h2 class="form-title">登录</h2>
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <input
            class="form-input"
            type="email"
            id="email"
            v-model="email"
            placeholder="请输入邮箱"
            required
          />
        </div>
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <input
            class="form-input"
            type="password"
            id="password"
            v-model="password"
            placeholder="请输入密码"
            required
          />
        </div>
        <button class="submit-button" type="submit">登录</button>
      </form>
      <div class="signup-link">
        <span>还没有账号？</span>
        <a href="/signup">去注册</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import useAuthStore from "@/stores/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");

const handleLogin = async () => {
  const { data, error } = await authStore.login(email.value, password.value);
  if (error) {
    alert(error.message);
  } else {
    // 等待一下让认证状态更新完成
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push("/");
  }
};
</script>

<style scoped>
.login-container {
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

.login-form {
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

.submit-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 188, 212, 0.3);
}

.submit-button:active {
  transform: translateY(0);
}

.signup-link {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #444;
  color: #999;
  font-size: 14px;
}

.signup-link a {
  color: #00bcd4;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.signup-link a:hover {
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
