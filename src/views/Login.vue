<template>
  <div class="login-container">
    <form class="login-form">
      <div class="form-item">
        <label for="email">邮箱</label>
        <input type="text" id="email" v-model="email" />
      </div>
      <div class="form-item">
        <label for="password">密码</label>
        <input type="password" id="password" v-model="password" />
      </div>
      <div class="form-item">
        <label for="confirm-password">确认密码</label>
        <input
          type="password"
          id="confirm-password"
          v-model="confirmPassword"
        />
      </div>
      <button type="submit">登录</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
</script>

<style scoped>
.login-container {
  display: flex;
  width: 300px;
  justify-content: center;
  align-items: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 1.5rem;
}

.form-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 10px;
}
</style>
