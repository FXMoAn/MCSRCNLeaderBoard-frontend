<template>
  <nav>
    <div class="logo" @click="backToHome">
      <span> MCSR-CN </span>
    </div>
    <!-- <div class="links">
        <div><router-link to="/rank" class="nav-link">排行榜</router-link></div>
        <div><a>管理员</a></div>
    </div> -->
    <!-- <div class="search-form">
        <input id="search-user" type="text" placeholder="输入用户名..." v-model="nickName"/>
        <el-button :icon="Search" circle @click="routeToSpace"/>
    </div>  -->
    <UserPanel
      v-if="userStore.isLoggedin"
      @signOut="userStore.isLoggedin = false"
    />
    <AuthControl v-else />
  </nav>
  <div class="container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import "@/assets/main.css";
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import authManager from "@/utils/auth";
import userService from "@/utils/user";
// 用户登录控制
import AuthControl from "@/components/AuthControl.vue";
import UserPanel from "@/components/UserPanel.vue";
import useUserStore from "@/stores/user";

const router = useRouter();
const userStore = useUserStore();

const backToHome = () => {
  router.push("/");
};

onMounted(() => {
  userStore.isLoggedin = authManager.isLoggedin();
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
  justify-content: center;
  align-items: center;
  gap: 2rem;
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
