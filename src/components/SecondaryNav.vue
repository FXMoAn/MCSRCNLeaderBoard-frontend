<template>
  <div class="secondary-nav-container">
    <nav class="secondary-nav">
      <div class="nav-links">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-text">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
    <div class="content-area">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

interface NavItem {
  path: string;
  label: string;
}

interface Props {
  title: string;
  navItems: NavItem[];
}

const props = defineProps<Props>();
const route = useRoute();
</script>

<style scoped>
.secondary-nav-container {
  display: flex;
  width: 100%;
  max-width: 1200px;
  min-height: calc(100vh - 80px);
  margin: 0 auto;
  gap: 0;
}

.secondary-nav {
  display: flex;
  flex-direction: column;
  width: 200px;
  padding: 24px 0;
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #ccc;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.95em;
}

.nav-item:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: #00bcd4;
  background-color: rgba(0, 188, 212, 0.1);
  border-left: 2px solid #00bcd4;
}

.nav-text {
  white-space: nowrap;
}

.content-area {
  flex: 1;
  padding: 24px;
  min-height: calc(100vh - 80px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .secondary-nav-container {
    flex-direction: column;
    max-width: 100%;
    margin: 0;
  }

  .secondary-nav {
    width: 100%;
    padding: 16px 0;
  }

  .nav-links {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 16px 8px 16px;
    gap: 8px;
  }

  .nav-item {
    padding: 10px 16px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .content-area {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .secondary-nav {
    padding: 12px 0;
  }

  .nav-links {
    padding: 0 12px 8px 12px;
  }

  .nav-item {
    padding: 8px 14px;
    font-size: 0.9em;
  }

  .content-area {
    padding: 16px;
  }
}
</style>
