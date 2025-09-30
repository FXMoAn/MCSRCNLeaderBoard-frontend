<template>
  <nav>
    <div class="logo" @click="backToHome">
      <span> MCSR-CN </span>
    </div>
    <!-- 屏幕宽度小于780px时，变为右侧抽屉菜单 -->
    <div class="links" v-if="windowWidth > 780">
      <div><router-link to="/rank" class="nav-link">排行榜</router-link></div>
      <div v-if="userStore.isBinding">
        <router-link to="/user-upload" class="nav-link">上传记录</router-link>
      </div>
      <div><router-link to="/stats" class="nav-link">统计数据</router-link></div>
      <div><a href="https://wiki.mcspeedrun.cn" target="_blank" class="nav-link">速通wiki</a></div>
      <div v-if="userStore.isAdmin">
        <router-link to="/manage/upload" class="nav-link">管理员</router-link>
      </div>
      <UserPanel v-if="authStore.isLoggedIn" @signOut="authStore.logout" class="control-item" />
      <AuthControl v-else class="control-item" />
    </div>
    <div class="drawer" v-else @click="isDrawerOpen = !isDrawerOpen">展开菜单</div>

    <!-- 背景遮罩 -->
    <div
      class="drawer-overlay"
      v-show="isDrawerOpen"
      v-if="windowWidth < 780"
      @click="isDrawerOpen = false"
    ></div>

    <!-- 抽屉内容 -->
    <div class="drawer-content" :class="{ 'drawer-open': isDrawerOpen }" v-if="windowWidth < 780">
      <div class="drawer-close" @click="isDrawerOpen = false">×</div>
      <UserPanel v-if="authStore.isLoggedIn" @signOut="authStore.logout" class="control-item" />
      <AuthControl v-else class="control-item" />
      <div>
        <router-link to="/rank" class="nav-link" @click="isDrawerOpen = false">排行榜</router-link>
      </div>
      <div v-if="userStore.isBinding">
        <router-link to="/user-upload" class="nav-link" @click="isDrawerOpen = false"
          >上传记录</router-link
        >
      </div>
      <div>
        <router-link to="/stats" class="nav-link" @click="isDrawerOpen = false"
          >统计数据</router-link
        >
      </div>
      <div>
        <a
          href="https://wiki.mcspeedrun.cn"
          target="_blank"
          class="nav-link"
          @click="isDrawerOpen = false"
          >速通wiki</a
        >
      </div>
      <div v-if="userStore.isAdmin">
        <router-link to="/manage/upload" class="nav-link" @click="isDrawerOpen = false"
          >管理员</router-link
        >
      </div>
    </div>
  </nav>
  <div class="container">
    <router-view />
  </div>
  <footer>
    <p>&copy; 2025 MCSR-CN 中国我的世界JAVA版速通排行榜. 保留所有权利</p>
    <a href="https://wiki.mcspeedrun.cn/advanced/cn-ldb/PrivacyPolicy" target="_blank">隐私政策</a>
  </footer>
  <!-- 全局通知组件 -->
  <Notification />
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useWindowSize } from '@vueuse/core';
// 用户登录控制
import AuthControl from '@/components/AuthControl.vue';
import UserPanel from '@/components/UserPanel.vue';
import Notification from '@/components/Notification.vue';
import { useAuthStore, useUserStore } from '@/stores';
import { eventBus, AUTH_EVENTS } from '@/stores/eventBus';

const router = useRouter();
const authStore = useAuthStore();
const userStore = useUserStore();

const backToHome = () => {
  router.push('/');
};

// 获取窗口宽度
const { width: windowWidth } = useWindowSize();

const isDrawerOpen = ref(false);

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
  // if (authStore.isLoggedIn && authStore.user) {
  //   eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, authStore.user);
  // }
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

.nav-link.router-link-active {
  color: #00bcd4;
  background-color: rgba(0, 188, 212, 0.1);
  border: 1px solid rgba(0, 188, 212, 0.3);
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
  gap: 10px;
  margin-left: 1rem;
  font-size: 14px;

  .control-item {
    margin-left: auto;
  }
}

footer {
  width: 100%;
  display: flex;
  justify-content: center;
  background-color: var(--bgcolor);
}

footer > p,
footer > a {
  text-align: center;
  padding: 10px;
  color: rgb(204, 204, 204, 0.4);
}

footer > a:hover {
  text-decoration: underline;
  color: #00bcd4;
}

.drawer {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.drawer:hover {
  background-color: rgba(255, 255, 255, 0.2);
  color: #00bcd4;
}

/* 背景遮罩 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 抽屉内容 */
.drawer-content {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background-color: #444;
  color: white;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-top: 20px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
}

.drawer-content.drawer-open {
  transform: translateX(0);
}

.drawer-close {
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #333;
  border: 1px solid #555;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.drawer-close:hover {
  background-color: #555;
  color: #00bcd4;
}

/* 响应式调整 */
@media (max-width: 480px) {
  .drawer-content {
    width: 260px;
  }
}
</style>
