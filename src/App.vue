<template>
  <nav>
    <div class="logo">
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
  </nav>
  <div class="container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import "@/assets/main.css";

// const routeToSpace = () => {
//   if (nickName.value.trim()) {
//     router.push({
//       name: "space",
//       query: { nickname: nickName.value.trim() },
//     });
//   } else {
//     alert("请先输入玩家名字");
//   }
// };
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: calc(100vh - 80px);
  background-color: var(--bgcolor);
}

nav {
  display: flex;
  justify-content: flex-start;
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
  margin-left: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
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

.search-form {
  flex: 1;
  margin-right: 2rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

#search-user {
  width: 10rem;
  height: 5vh;
  border: 0;
  margin-left: 1rem;
  text-indent: 0.5rem;
  border-radius: 5px;
}

@media (max-width: 780px) {
  .container {
    width: 100%;
  }
}
</style>
