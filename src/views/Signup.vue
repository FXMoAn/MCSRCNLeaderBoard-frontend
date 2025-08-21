<template>
  <div class="signup-container">
    <form class="signup-form" @submit.prevent="handleSignup">
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
      </div>
      <div class="confirm-password-item">
        <input
          class="confirm-password-input"
          type="password"
          id="confirm-password"
          v-model="confirmPassword"
          placeholder="请确认密码"
          required
        />
      </div>
      <button class="signup-button" type="submit">注册</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import useAuthStore from "@/stores/auth";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const confirmPassword = ref("");

const checkPassword = () => {
  if (password.value !== confirmPassword.value) {
    alert("密码不一致");
    return false;
  }
  return true;
};

const authStore = useAuthStore();
const router = useRouter();

const signUpNewUser = async () => {
  const { data, error } = await authStore.signup(email.value, password.value);
  if (error) {
    alert(error.message);
  } else {
    alert("注册成功");
    router.push("/login");
  }
};

const handleSignup = async () => {
  if (checkPassword()) {
    await signUpNewUser();
  }
};
</script>

<style scoped>
.signup-container {
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

.signup-form {
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

  .password-input {
    width: 100%;
    box-sizing: border-box;
    background-color: #d6d8d9;
    color: #929493;
    border-radius: 20px;
    padding: 10px;
  }
}

.confirm-password-item {
  width: 100%;

  .confirm-password-input {
    width: 100%;
    box-sizing: border-box;
    background-color: #d6d8d9;
    color: #929493;
    border-radius: 20px;
    padding: 10px;
  }
}

.confirm-password-input {
  width: 100%;
  height: 30px;
}

.signup-button {
  width: 100%;
  height: 30px;
  background-color: #d6d8d9;
  color: #929493;
  border-radius: 20px;
  padding: 10px;
}
</style>
