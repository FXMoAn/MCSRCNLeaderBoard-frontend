<template>
  <div v-if="storedUid" class="bilibili-identity">
    <span class="identity-label">B 站 UID</span>
    <a
      class="identity-value"
      :href="`https://space.bilibili.com/${storedUid}`"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`B 站 UID ${storedUid}，查看 B 站空间`"
    >
      {{ storedUid }} <TopRight aria-hidden="true" />
    </a>
    <InfoHint text="已关联的 B 站账号 UID，仅管理员可以修改。" />
    <RouterLink
      v-if="canManage"
      class="manage-identity"
      :to="{ path: '/manage/user', query: { userId: profileId }, hash: '#bilibili' }"
      aria-label="管理 B 站 UID"
      title="管理 B 站 UID"
    >
      <EditPen aria-hidden="true" />
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { EditPen, TopRight } from '@element-plus/icons-vue';
import InfoHint from '@/components/common/InfoHint.vue';
const props = defineProps<{
  uid: string | null | undefined;
  profileId: number;
  canManage?: boolean;
}>();
const storedUid = computed(() => props.uid?.trim() ?? '');
</script>

<style scoped>
.bilibili-identity {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}
.identity-label {
  margin-right: 4px;
  color: var(--text-secondary);
  font-size: 14px;
}
.identity-value {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--accent-bright);
  font-size: 14px;
  overflow-wrap: anywhere;
}
.identity-value svg {
  width: 13px;
  height: 13px;
}
.manage-identity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
}
.manage-identity svg {
  width: 15px;
  height: 15px;
}
.manage-identity:hover {
  background: var(--panel-raised);
  border-color: var(--accent);
}
.identity-value:focus-visible,
.manage-identity:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
