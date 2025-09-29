<template>
  <div class="user-edit-container">
    <div class="user-edit-section">
      <div class="section-subtitle">个人资料</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import useUserStore from '@/stores/user';

const userStore = useUserStore();
const userInfo = ref(userStore.userInfo);
</script>

<style scoped>
.user-edit-container {
  width: 100%;
  height: 100%;
}
</style>
