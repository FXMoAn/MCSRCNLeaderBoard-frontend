<template>
  <nav>
    <div class="logo" @click="backToHome">
      <span> MCSR-CN </span>
    </div>
    <div class="links">
      <div><router-link to="/rank" class="nav-link">排行榜</router-link></div>
      <div v-if="userStore.isBinding">
        <router-link to="/user-upload" class="nav-link">上传记录</router-link>
      </div>
      <div><a href="https://wiki.mcspeedrun.cn" target="_blank" class="nav-link">速通wiki</a></div>
      <div v-if="userStore.isAdmin">
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
import '@/assets/main.css';
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
// 用户登录控制
import AuthControl from '@/components/AuthControl.vue';
import UserPanel from '@/components/UserPanel.vue';
import { useAuthStore, useUserStore } from '@/stores';
import { eventBus, AUTH_EVENTS } from '@/stores/eventBus';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const backToHome = () => {
  router.push('/');
};

// 监听认证状态变化，自动更新用户信息
watch(
  () => authStore.isLoggedIn,
  async (newValue) => {
    if (newValue && authStore.user) {
      // 用户登录后，通过事件总线通知用户信息初始化
      eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, authStore.user);
    }
  }
);

onMounted(async () => {
  // 先初始化认证状态
  await authStore.initializeAuth();

  // 等待认证完成后再初始化用户信息
  if (authStore.isLoggedIn && authStore.user) {
    eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, authStore.user);
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
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  font-weight: 500;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #00bcd4;
}

.logo {
  font-size: larger;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.links {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-left: 2rem;

  .nav-link.router-link-active {
    color: #00bcd4;
    background-color: rgba(0, 188, 212, 0.1);
    border: 1px solid rgba(0, 188, 212, 0.3);
  }
}

@media (max-width: 780px) {
  .container {
    width: 100%;
  }

  .links {
    gap: 1rem;
    margin-left: 1rem;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 14px;
  }
}
</style>
