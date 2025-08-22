<template>
  <nav>
    <div class="logo" @click="backToHome">
      <span> MCSR-CN </span>
    </div>
    <div class="links">
      <div><router-link to="/rank" class="nav-link">排行榜</router-link></div>
      <div v-if="isAdmin">
        <router-link to="/manage/upload" class="nav-link">管理员</router-link>
      </div>
    </div>
    <!-- <div class="search-form">
        <input id="search-user" type="text" placeholder="输入用户名..." v-model="nickName"/>
        <el-button :icon="Search" circle @click="routeToSpace"/>
    </div>  -->
    <UserPanel v-if="authStore.isLoggedIn" @signOut="authStore.logout" />
    <AuthControl v-else />
  </nav>
  <div class="container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import "@/assets/main.css";
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
// 用户登录控制
import AuthControl from "@/components/AuthControl.vue";
import UserPanel from "@/components/UserPanel.vue";
import { useAuthStore, useUserStore } from "@/stores";

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const isAdmin = computed(() => {
  return userStore.userInfo?.role === "admin";
});

const backToHome = () => {
  router.push("/");
};

onMounted(async () => {
  // 先初始化认证状态
  await authStore.initializeAuth();

  // 等待认证完成后再初始化用户信息
  if (authStore.isLoggedIn) {
    await userStore.initUserInfo();
  }
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 10px;
  min-height: calc(100vh - 80px);
  background-color: var(--bgcolor);
}

nav {
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  align-items: center;
  height: 80px;
  background-color: #333;
  color: white !important;
}

.nav-link {
  color: inherit;
  text-decoration: none;
}

.logo {
  font-size: larger;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.links {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-left: 2rem;

  .nav-link.router-link-active {
    color: #fff;
  }
}

@media (max-width: 780px) {
  .container {
    width: 100%;
  }
}
</style>
