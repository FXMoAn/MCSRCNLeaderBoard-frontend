<template>
  <div class="login-container">
    <form class="login-form" @submit.prevent="handleLogin">
      <div class="email-item">
        <input
          class="email-input"
          type="email"
          id="email"
          v-model="email"
          placeholder="请输入邮箱"
          required
        />
      </div>
      <div class="password-item">
        <input
          class="password-input"
          type="password"
          id="password"
          v-model="password"
          placeholder="请输入密码"
          required
        />
        <button class="login-button" type="submit">登录</button>
      </div>
    </form>
    <div class="signup-container">
      <a href="/signup">还没有账号?去注册</a>
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
    router.push("/");
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  padding: 20px;
  width: 300px;
  height: 200px;
  margin-top: 100px;
  justify-content: center;
  align-items: center;
  background-color: #a1a5a9;
  border-radius: 20px;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  font-size: 1.5rem;
  padding: 20px;
}

.email-item {
  width: 100%;

  .email-input {
    width: 100%;
    box-sizing: border-box;
    background-color: #d6d8d9;
    color: #929493;
    border-radius: 20px;
    padding: 10px;
  }
}

.password-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .password-input {
    flex: 1;
    margin-right: 10px;
    background-color: #d6d8d9;
    color: #929493;
    border-radius: 20px;
    padding: 10px;
  }

  .login-button {
    background-color: #fff;
    color: #000;
    border-radius: 20px;
    padding: 10px;
    width: 70px;
  }
}
</style>
