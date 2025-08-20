<template>
  <div
    class="user-panel"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @click="routeToBinding"
  >
    <div class="user-name">
      <span>{{ authStore.user?.email }}</span>
    </div>
    <div class="user-panel-button" v-show="hovered">
      <button @click="signOut">退出登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from "vue";
import useAuthStore from "@/stores/auth";
import { useRouter } from "vue-router";

const router = useRouter();
const authStore = useAuthStore();
const emit = defineEmits(["signOut"]);
const hovered = ref(false);

const routeToBinding = () => {
  router.push("/binding");
};

const signOut = () => {
  authStore.logout();
  emit("signOut");
};
</script>

<style scoped>
.user-panel {
  position: relative;
  cursor: pointer;
}

.user-name {
  font-size: 16px;
  font-weight: bold;
}

.user-panel-button {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}
</style>
