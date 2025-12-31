<template>
  <div class="nav-item-wrapper" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <!-- 主导航项 -->
    <component
      :is="to ? 'router-link' : href ? 'a' : 'div'"
      :to="to"
      :href="href"
      :target="href ? '_blank' : undefined"
      class="nav-link"
      :class="{ 'has-dropdown': hasDropdown, 'dropdown-open': isDropdownOpen }"
      @click="handleClick"
    >
      <span class="nav-text">{{ label }}</span>
      <span v-if="hasDropdown" class="dropdown-icon" :class="{ 'icon-rotate': isDropdownOpen }">
        ▼
      </span>
    </component>

    <!-- 下拉菜单 -->
    <transition name="dropdown">
      <div v-if="hasDropdown && isDropdownOpen" class="dropdown-menu">
        <template v-for="(item, index) in dropdownItems" :key="index">
          <component
            :is="item.to ? 'router-link' : item.href ? 'a' : 'div'"
            :to="item.to"
            :href="item.href"
            :target="item.href ? '_blank' : undefined"
            class="dropdown-item"
            @click="handleDropdownItemClick"
          >
            <span class="dropdown-item-text">{{ item.label }}</span>
          </component>
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface DropdownItem {
  label: string;
  to?: string; // Vue Router 路径
  href?: string; // 外部链接
}

interface Props {
  label: string;
  to?: string; // Vue Router 路径
  href?: string; // 外部链接
  dropdownItems?: DropdownItem[]; // 下拉菜单项
  hoverTrigger?: boolean; // 是否使用悬停触发（默认 true）
}

const props = withDefaults(defineProps<Props>(), {
  hoverTrigger: true,
  dropdownItems: () => [],
});

const isDropdownOpen = ref(false);

const hasDropdown = computed(() => {
  return props.dropdownItems && props.dropdownItems.length > 0;
});

const handleMouseEnter = () => {
  if (props.hoverTrigger && hasDropdown.value) {
    isDropdownOpen.value = true;
  }
};

const handleMouseLeave = () => {
  if (props.hoverTrigger && hasDropdown.value) {
    isDropdownOpen.value = false;
  }
};

const handleClick = (event: Event) => {
  // 如果有下拉菜单且不使用悬停触发，则点击切换下拉菜单
  if (hasDropdown.value && !props.hoverTrigger) {
    event.preventDefault();
    isDropdownOpen.value = !isDropdownOpen.value;
  }
  // 如果有下拉菜单且使用悬停触发，点击时也切换下拉菜单（移动端友好）
  else if (hasDropdown.value && props.hoverTrigger) {
    event.preventDefault();
    isDropdownOpen.value = !isDropdownOpen.value;
  }
};

const handleDropdownItemClick = () => {
  // 点击下拉菜单项后关闭下拉菜单
  isDropdownOpen.value = false;
};
</script>

<style scoped>
.nav-item-wrapper {
  position: relative;
  display: inline-block;
}

.nav-link {
  color: inherit;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
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

.nav-link.has-dropdown {
  padding-right: 12px;
}

.nav-link.dropdown-open {
  background-color: rgba(255, 255, 255, 0.1);
  color: #00bcd4;
}

.nav-text {
  display: inline-block;
}

.dropdown-icon {
  font-size: 10px;
  transition: transform 0.3s ease;
  display: inline-block;
  margin-left: 2px;
}

.dropdown-icon.icon-rotate {
  transform: rotate(180deg);
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 160px;
  background-color: #444;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  padding: 8px 0;
  z-index: 1000;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dropdown-item {
  display: block;
  padding: 10px 20px;
  color: #ccc;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.dropdown-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #00bcd4;
}

.dropdown-item.router-link-active {
  color: #00bcd4;
  background-color: rgba(0, 188, 212, 0.1);
}

.dropdown-item-text {
  display: inline-block;
}

/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式调整 */
@media (max-width: 780px) {
  .dropdown-menu {
    position: static;
    box-shadow: none;
    background-color: transparent;
    border: none;
    padding: 4px 0 4px 16px;
    min-width: auto;
  }

  .dropdown-item {
    padding: 8px 16px;
    border-radius: 6px;
  }
}
</style>
