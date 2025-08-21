<template>
  <div class="mcname-container">
    <input
      type="text"
      class="mcname-input"
      v-model="ingamename"
      placeholder="输入Minecraft用户名"
    />
    <button class="button-common" @click="handleGetMCID">获取MCID</button>
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
  await userStore.getMinecraftId(ingamename.value);
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
</style>
