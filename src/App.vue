<template>
  <nav @keydown.esc="isDrawerOpen = false">
    <div class="nav-inner">
      <div class="logo" @click="backToHome">
        <img class="logo-mark" :src="logoMark" alt="MCSR-CN" />
        <span class="logo-text">MCSR-CN</span>
      </div>
      <!-- 窄屏使用抽屉，为已登录用户的更多入口保留空间。 -->
      <div class="links" v-if="windowWidth > NAV_BREAKPOINT">
        <div><router-link to="/rank" class="nav-link">排行榜</router-link></div>
        <div><router-link to="/announcements" class="nav-link">公告</router-link></div>
        <div><router-link to="/resources" class="nav-link">资源</router-link></div>
        <div v-if="userStore.isBinding">
          <router-link to="/user-upload" class="nav-link">上传成绩</router-link>
        </div>
        <div>
          <a
            href="https://apac.blankboi.cn/schedule"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link"
          >
            APAC 月赛 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div v-if="userStore.isAdmin">
          <router-link to="/manage/upload" class="nav-link">管理员</router-link>
        </div>
        <UserPanel v-if="authStore.isLoggedIn" @signOut="authStore.logout" class="control-item" />
        <AuthControl v-else class="control-item" />
      </div>
      <button
        type="button"
        class="drawer"
        v-else
        :aria-expanded="isDrawerOpen"
        aria-label="打开菜单"
        aria-controls="mobile-navigation"
        @click="isDrawerOpen = !isDrawerOpen"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
        </svg>
      </button>
    </div>

    <!-- 背景遮罩 -->
    <div
      class="drawer-overlay"
      v-show="isDrawerOpen"
      v-if="windowWidth <= NAV_BREAKPOINT"
      @click="isDrawerOpen = false"
    ></div>

    <!-- 抽屉内容 -->
    <div
      id="mobile-navigation"
      class="drawer-content drawer-open"
      v-if="windowWidth <= NAV_BREAKPOINT && isDrawerOpen"
    >
      <button
        type="button"
        class="drawer-close"
        aria-label="关闭菜单"
        @click="isDrawerOpen = false"
      >
        ×
      </button>
      <div class="drawer-section" role="group" aria-label="账号">
        <UserPanel v-if="authStore.isLoggedIn" @signOut="authStore.logout" class="control-item" />
        <AuthControl v-else class="control-item" />
      </div>
      <div class="drawer-section" role="group" aria-label="站内导航">
        <router-link to="/rank" class="nav-link" @click="isDrawerOpen = false">排行榜</router-link>
        <router-link to="/announcements" class="nav-link" @click="isDrawerOpen = false"
          >公告</router-link
        >
        <router-link to="/resources" class="nav-link" @click="isDrawerOpen = false"
          >资源</router-link
        >
        <router-link
          v-if="userStore.isBinding"
          to="/user-upload"
          class="nav-link"
          @click="isDrawerOpen = false"
          >上传成绩</router-link
        >
        <router-link
          v-if="userStore.isAdmin"
          to="/manage/upload"
          class="nav-link"
          @click="isDrawerOpen = false"
          >管理员</router-link
        >
      </div>
      <div class="drawer-section" role="group" aria-label="外部链接">
        <a
          href="https://apac.blankboi.cn/schedule"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-link"
          @click="isDrawerOpen = false"
          >APAC 月赛 <span aria-hidden="true">↗</span></a
        >
      </div>
    </div>
  </nav>
  <div class="container">
    <router-view />
  </div>
  <footer>
    <div class="footer-links">
      <router-link to="/rank">排行榜</router-link>
      <span aria-hidden="true">·</span>
      <router-link to="/announcements">公告</router-link>
      <span aria-hidden="true">·</span>
      <router-link to="/resources">资源</router-link>
      <span aria-hidden="true">·</span>
      <a
        href="https://wiki.mcspeedrun.cn/advanced/cn-ldb/PrivacyPolicy"
        target="_blank"
        rel="noopener noreferrer"
        >隐私政策</a
      >
    </div>
    <p>&copy; 2025 MCSR-CN 中国我的世界JAVA版速通排行榜. 保留所有权利</p>
  </footer>
  <!-- 全局通知组件 -->
  <Notification />
</template>

<script setup lang="ts">
import '@/assets/main.css';
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useWindowSize } from '@vueuse/core';
import logoMark from '@/assets/end-podium.webp';
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
const NAV_BREAKPOINT = 1024;

const isDrawerOpen = ref(false);
watch(windowWidth, (width) => {
  if (width > NAV_BREAKPOINT) isDrawerOpen.value = false;
});

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
  padding-top: 16px;
  min-height: calc(100vh - 120px);
  background-color: transparent;
}

nav {
  position: sticky;
  top: 0;
  z-index: 500;
  background-color: var(--nav-bg);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  height: 56px;
  max-width: 1400px;
  margin: 0 auto;
  color: #fff;
}

.nav-link {
  color: inherit;
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;
  position: relative;
  font-weight: 500;
  white-space: nowrap;
}

.nav-link:hover {
  background-color: rgba(0, 0, 0, 0.18);
  color: #fff;
}

.nav-link.router-link-active {
  color: #fff;
  background-color: rgba(0, 0, 0, 0.25);
  font-weight: 600;
}

.nav-link:focus-visible,
.drawer:focus-visible,
.drawer-close:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.logo-mark {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.4));
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.links {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 1.5rem;
  font-size: 14px;
  color: #fff;

  .control-item {
    margin-left: auto;
  }
}

footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 16px 28px;
  background-color: transparent;
  border-top: 1px solid var(--border);
  margin-top: 32px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 14px;
}

.footer-links a {
  color: var(--text-secondary);
  padding: 2px 4px;
}

.footer-links a:hover {
  color: var(--accent-bright);
  text-decoration: underline;
}

.footer-links span {
  color: var(--text-muted);
}

footer > p {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 4px;
}

.drawer {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  background-color: transparent;
  border: none;
  color: #fff;
  font: inherit;
}

.drawer:hover {
  background-color: rgba(0, 0, 0, 0.18);
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
  background-color: var(--panel);
  color: #fff;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 64px 16px 20px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
}

.drawer-content.drawer-open {
  transform: translateX(0);
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.drawer-section:last-child {
  border-bottom: none;
}

.drawer-section .nav-link {
  display: block;
  padding: 12px 14px;
  font-size: 15px;
}

.drawer-section .control-item {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
}

.drawer-close {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 24px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--panel-raised);
  border: 1px solid var(--border);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.drawer-close:hover {
  background-color: var(--border);
  color: var(--accent-bright);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .drawer-content {
    width: 260px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-link,
  .drawer,
  .drawer-close,
  .drawer-content,
  .logo {
    transition: none;
  }
  .drawer-overlay {
    animation: none;
  }
}
</style>
