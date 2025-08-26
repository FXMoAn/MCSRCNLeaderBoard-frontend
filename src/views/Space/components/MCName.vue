<template>
  <div class="mcname-container" v-if="!userStore.isBindMinecraftId">
    <div class="section-subtitle">绑定Minecraft用户名（paceman绑定的账号/ranked使用账号）</div>
    <div class="form-row">
      <input
        type="text"
        class="form-input"
        v-model="ingamename"
        placeholder="输入Minecraft用户名"
      />
      <button class="form-button" @click="handleGetMCID">获取MCID并绑定</button>
    </div>
  </div>

  <div class="mcname-container" v-else>
    <div class="mcname-info">
      <div class="section-subtitle">已绑定Minecraft用户名</div>
      <div class="mcname-display-container">
        <p class="mcname-display">{{ userStore.userInfo.ingamename }}</p>
        <button class="form-button refresh-button" @click="handleRefreshMCID">刷新</button>
      </div>
    </div>
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

const handleRefreshMCID = async () => {
  await userStore.refreshMinecraftId();
};
</script>

<style scoped>
.mcname-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.section-subtitle {
  color: #ccc;
  font-size: 1.1em;
  font-weight: 500;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.form-input {
  flex: 1;
  padding: 12px 16px;
  background-color: #333;
  border: 1px solid #444;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #666;
}

.form-input:focus {
  outline: none;
  border-color: #00bcd4;
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.1);
}

.form-button {
  background: linear-gradient(135deg, #00bcd4, #0097a7);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.form-button:hover {
  background: linear-gradient(135deg, #00acc1, #00838f);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
}

.form-button:active {
  transform: translateY(0);
}

.mcname-info {
  text-align: center;
  padding: 20px;
}

.mcname-display-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.mcname-display {
  color: #00bcd4;
  font-size: 1.2em;
  font-weight: 600;
  margin: 0;
  padding: 16px;
  background-color: rgba(0, 188, 212, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(0, 188, 212, 0.3);
  flex: 1;
}

.refresh-button {
  max-width: 100px;
}

@media (max-width: 768px) {
  .mcname-container {
    padding: 0 16px;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .form-button {
    width: 100%;
  }

  .mcname-display {
    font-size: 1.1em;
    padding: 14px;
  }
}
</style>
