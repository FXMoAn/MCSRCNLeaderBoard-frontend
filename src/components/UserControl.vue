<template>
  <div class="user-control">
    <button class="login" @click="navigateToSignin">登录</button>
    <button class="register" @click="navigateToSignup">注册</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const navigateToSignin = () => {
  router.push("/login");
};

const navigateToSignup = () => {
  router.push("/register");
};
</script>

<style scoped>
.user-control {
  display: flex;
  gap: 10px;

  .login {
    background-color: #000;
    color: #fff;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
  }

  .register {
    background-color: #fff;
    color: #000;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
  }
}
</style>
