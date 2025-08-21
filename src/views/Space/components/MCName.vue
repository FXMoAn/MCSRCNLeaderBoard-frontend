<template>
  <div class="mcname-container" v-if="!userStore.isBindMinecraftId">
    <input
      type="text"
      class="mcname-input"
      v-model="ingamename"
      placeholder="输入Minecraft用户名"
    />
    <button class="button-common" @click="handleGetMCID">获取MCID并绑定</button>
  </div>
  <div class="mcname-container" v-else>
    <p class="mcname-text">
      您已绑定Minecraft用户名：{{ userStore.userInfo.ingamename }}
    </p>
  </div>
</template>

<script setup lang="ts">
import useUserStore from "@/stores/user";
import { ref, computed } from "vue";

const userStore = useUserStore();

const ingamename = ref("");

const handleGetMCID = async () => {
  if (!ingamename.value.trim()) {
    alert("请输入Minecraft用户名");
    return;
  }
  await userStore.bindMinecraftId(ingamename.value);
};
</script>

<style scoped>
.mcname-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mcname-input {
  width: 200px;
  color: #000;
  height: 40px;
  max-width: 200px;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0 10px;
}

.mcname-text {
  font-size: 16px;
  color: #fff;
}
</style>
