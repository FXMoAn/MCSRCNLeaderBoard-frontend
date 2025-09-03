<template>
  <div class="user-panel">
    <div
      class="user-info"
      @click="routeToBinding"
      @mouseenter="showDropdown"
      @mouseleave="hideDropdown"
    >
      <div class="user-avatar">
        <span class="avatar-text">{{ displayUserName?.charAt(0)?.toUpperCase() }}</span>
      </div>
      <span class="user-name">{{ displayUserName }}</span>
      <div class="dropdown-arrow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>
    </div>
    <div
      class="user-dropdown"
      v-show="hovered"
      @mouseenter="showDropdown"
      @mouseleave="hideDropdown"
    >
      <div class="dropdown-item profile-item" @click="routeToBinding">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <span>个人资料</span>
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item logout-item" @click="signOut">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
          />
        </svg>
        <span>退出登录</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, computed } from 'vue';
import useAuthStore from '@/stores/auth';
import useUserStore from '@/stores/user';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const emit = defineEmits(['signOut']);
const hovered = ref(false);
const userStore = useUserStore();
let hideTimeout: number | null = null;

const displayUserName = computed(() => {
  return userStore.isBinding ? userStore.userInfo?.nickname : authStore.user?.email;
});

const routeToBinding = () => {
  router.push('/space/binding');
};

const signOut = () => {
  authStore.logout();
  emit('signOut');
};

const showDropdown = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  hovered.value = true;
};

const hideDropdown = () => {
  hideTimeout = window.setTimeout(() => {
    hovered.value = false;
  }, 150);
};
</script>

<style scoped>
.user-panel {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.user-info:hover {
  background-color: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  color: #ccc;
  transition: transform 0.3s ease;
}

.user-panel:hover .dropdown-arrow {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 8px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  z-index: 1000;
  animation: fadeInDown 0.2s ease;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #ccc;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.dropdown-item:hover {
  background-color: #444;
  color: #fff;
}

.dropdown-item svg {
  color: #999;
  transition: color 0.2s ease;
}

.dropdown-item:hover svg {
  color: #00bcd4;
}

.dropdown-divider {
  height: 1px;
  background-color: #444;
  margin: 4px 0;
}

.logout-item:hover {
  color: #ff6b6b;
}

.logout-item:hover svg {
  color: #ff6b6b;
}

@media (max-width: 480px) {
  .user-name {
    max-width: 80px;
  }

  .user-dropdown {
    min-width: 160px;
  }
}
</style>
