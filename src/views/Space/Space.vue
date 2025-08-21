<template>
  <div class="space-container">
    <nav>
      <router-link to="/space/profile" class="space-nav-item"
        >个人信息</router-link
      >
      <router-link to="/space/binding" class="space-nav-item"
        >绑定账号</router-link
      >
    </nav>
    <div class="space-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
</script>

<style scoped>
.space-container {
  display: flex;
  width: 80%;
  min-height: 100vh;
}

nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20%;
  padding: 0 20px;
}

.space-nav-item {
  text-decoration: none;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  padding: 0 10px;
  border-left: 2px solid #fff;
}

.space-content {
  width: 80%;
  height: 100%;
}
</style>
