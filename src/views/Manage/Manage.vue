<template>
  <div class="manage-container">
    <nav>
      <router-link to="/manage/upload" class="manage-nav-item"
        >上传成绩</router-link
      >
    </nav>
    <div class="manage-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.manage-container {
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

.manage-nav-item {
  text-decoration: none;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  padding: 0 10px;
  border-left: 2px solid #fff;
}

.manage-content {
  width: 80%;
  min-height: 100vh;
}
</style>
