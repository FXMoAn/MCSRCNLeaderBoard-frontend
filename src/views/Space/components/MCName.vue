<template>
  <div class="minecraft-account">
    <div class="account-label">
      <span v-if="userStore.isBindMinecraftId">Minecraft 用户名</span>
      <label v-else for="minecraft-username">Minecraft 用户名</label>
      <InfoHint text="用于获取 Paceman 和 Ranked 数据。游戏内改名后，可刷新这里的用户名。" />
    </div>
    <div v-if="userStore.isBindMinecraftId" class="bound-account">
      <span class="account-name">{{ userStore.userInfo.ingamename }}</span>
      <PrimaryButton
        class="mc-refresh"
        variant="clear"
        :disabled="disabled"
        :loading="busy"
        :aria-busy="busy"
        aria-label="刷新 Minecraft 用户名"
        title="刷新 Minecraft 用户名"
        @click="handleRefreshMCID"
      >
        <RefreshRight aria-hidden="true" :class="{ spinning: busy }" />
      </PrimaryButton>
    </div>
    <div v-else class="binding-row" @keydown="handleKeydown">
      <PrimaryInput
        id="minecraft-username"
        v-model="ingamename"
        placeholder="游戏内用户名"
        :max-length="16"
        :disabled="busy || disabled"
      />
      <PrimaryButton
        :disabled="!ingamename.trim() || disabled"
        :loading="busy"
        @click="handleGetMCID"
        >绑定</PrimaryButton
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RefreshRight } from '@element-plus/icons-vue';
import useUserStore from '@/stores/user';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import InfoHint from '@/components/common/InfoHint.vue';
import { showErrorNotification } from '@/utils/notification';
const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ 'busy-change': [value: boolean] }>();
const userStore = useUserStore();
const ingamename = ref('');
const busy = ref(false);
async function run(action: () => Promise<void>) {
  if (busy.value || props.disabled) return;
  busy.value = true;
  emit('busy-change', true);
  try {
    await action();
  } finally {
    busy.value = false;
    emit('busy-change', false);
  }
}
const handleGetMCID = () => {
  const name = ingamename.value.trim();
  if (!name) {
    showErrorNotification('请输入 Minecraft 用户名');
    return;
  }
  return run(() => userStore.bindMinecraftId(name));
};
const handleRefreshMCID = () => run(() => userStore.refreshMinecraftId());
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    void handleGetMCID();
  }
};
</script>

<style scoped>
.minecraft-account {
  min-width: 0;
}
.account-label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  min-height: 20px;
}
.account-label label,
.account-label span {
  color: var(--text-secondary);
  font-size: 14px;
}
.account-label :deep(.info-hint) {
  height: 20px;
}
.bound-account {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.account-name {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bgcolor);
  color: var(--accent-bright);
  font-size: 14px;
  font-weight: 500;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.mc-refresh {
  width: 44px;
  height: 44px;
  padding: 12px;
  border-color: var(--border-light);
}
.mc-refresh svg {
  width: 18px;
  height: 18px;
}
.mc-refresh:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.mc-refresh.btn-loading {
  background: transparent;
}
.binding-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.binding-row :deep(.primary-input-container) {
  flex: 1;
  min-width: 0;
}
.binding-row :deep(.primary-input) {
  width: 100%;
  background: var(--bgcolor);
  border-color: var(--border-light);
}
.binding-row :deep(button) {
  min-height: 44px;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
