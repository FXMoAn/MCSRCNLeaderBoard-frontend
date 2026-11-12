<template>
  <div class="profile-settings">
    <header class="settings-heading">
      <h1>个人资料</h1>
      <RouterLink
        v-if="userStore.isBinding"
        class="profile-preview"
        :to="`/profile/${userStore.userInfo.id}`"
      >
        查看我的主页 <TopRight aria-hidden="true" />
      </RouterLink>
    </header>
    <Loading v-if="userStore.loading && !userStore.isBinding" />
    <div v-else-if="userStore.profileStatus === 'error'" class="profile-load-error" role="alert">
      <p>{{ userStore.profileError }}</p>
      <PrimaryButton @click="userStore.initUserInfo">重新加载</PrimaryButton>
    </div>
    <Nickname v-else-if="!userStore.isBinding" />
    <form
      v-else
      class="settings-grid"
      novalidate
      :aria-busy="saving"
      @submit.prevent="handleSave"
      @keydown.enter="handleEnter"
    >
      <section class="settings-panel" aria-labelledby="basic-info-heading">
        <h2 id="basic-info-heading">基本信息</h2>
        <div class="settings-fields">
          <PrimaryInput
            id="profile-nickname"
            v-model="draft.nickname"
            @update:modelValue="clearFieldError('nickname')"
            label="昵称"
            layout="stacked"
            autocomplete="nickname"
            :max-length="50"
            :error="errors.nickname"
            :disabled="saving"
          />
          <MCName :disabled="saving" @busy-change="accountBusy = $event" />
          <BiliName
            :uid="userStore.userInfo.bili_id"
            :profile-id="userStore.userInfo.id"
            :can-manage="!!userStore.isAdmin"
          />
        </div>
      </section>
      <section class="settings-panel" aria-labelledby="public-links-heading">
        <div class="panel-heading">
          <h2 id="public-links-heading">公开链接</h2>
          <InfoHint text="这些链接会展示在你的个人主页上。" />
        </div>
        <div class="settings-fields">
          <PrimaryInput
            id="profile-homepage"
            v-model="draft.spaceLink"
            @update:modelValue="clearFieldError('spaceLink')"
            label="主页链接"
            layout="stacked"
            type="url"
            placeholder="https://space.bilibili.com/..."
            :error="errors.spaceLink"
            :disabled="saving"
          />
          <PrimaryInput
            id="profile-livestream"
            v-model="draft.liveroomLink"
            @update:modelValue="clearFieldError('liveroomLink')"
            label="直播间链接"
            layout="stacked"
            type="url"
            placeholder="https://live.bilibili.com/..."
            :error="errors.liveroomLink"
            :disabled="saving"
          />
        </div>
      </section>
      <div class="settings-actions">
        <p class="save-error" role="alert">{{ saveError }}</p>
        <PrimaryButton variant="clear" :disabled="!isDirty || saving" @click="resetDraft"
          >重置</PrimaryButton
        >
        <PrimaryButton type="submit" :disabled="!isDirty || accountBusy" :loading="saving">{{
          saving ? '保存中…' : '保存资料'
        }}</PrimaryButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onScopeDispose, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { safeRedirect } from '@/auth/flow';
import { ElMessageBox } from 'element-plus';
import { TopRight } from '@element-plus/icons-vue';
import useUserStore from '@/stores/user';
import { validateNickname } from '@/utils/security';
import type { UserInfo } from '@/types/CommonTypes';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import InfoHint from '@/components/common/InfoHint.vue';
import Loading from '@/components/common/Loading.vue';
import Nickname from '../components/Nickname.vue';
import MCName from '../components/MCName.vue';
import BiliName from '../components/BiliName.vue';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
watch(
  () => userStore.profileStatus,
  (status) => {
    if (status === 'ready' && route.query.setup === '1')
      void router.replace(safeRedirect(route.query.redirect));
  }
);
const saving = ref(false);
const accountBusy = ref(false);
const saveError = ref('');
const draft = reactive({ nickname: '', spaceLink: '', liveroomLink: '' });
const baseline = ref({ ...draft });
const errors = reactive({ nickname: '', spaceLink: '', liveroomLink: '' });
function clearFieldError(field: keyof typeof draft) {
  errors[field] = '';
  saveError.value = '';
}
const isDirty = computed(() =>
  Object.keys(draft).some(
    (key) => draft[key as keyof typeof draft] !== baseline.value[key as keyof typeof draft]
  )
);

function resetDraft() {
  baseline.value = {
    nickname: userStore.userInfo.nickname ?? '',
    spaceLink: userStore.userInfo.space_link ?? '',
    liveroomLink: userStore.userInfo.liveroom_link ?? '',
  };
  Object.assign(draft, baseline.value);
  Object.assign(errors, { nickname: '', spaceLink: '', liveroomLink: '' });
  saveError.value = '';
}
watch(
  () => [
    userStore.userInfo.id,
    userStore.userInfo.nickname,
    userStore.userInfo.space_link,
    userStore.userInfo.liveroom_link,
  ],
  (current, previous) => {
    if (!previous || current[0] !== previous[0] || !isDirty.value) resetDraft();
  },
  { immediate: true }
);

function handleEnter(event: KeyboardEvent) {
  if (event.isComposing) event.preventDefault();
}
function validateLink(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'http:' || url.protocol === 'https:') return '';
  } catch {
    /* Use inline validation. */
  }
  return '请输入完整的 http:// 或 https:// 链接';
}
async function handleSave() {
  if (saving.value || accountBusy.value || !isDirty.value) return;
  Object.assign(errors, { nickname: '', spaceLink: '', liveroomLink: '' });
  saveError.value = '';
  const updates: Partial<UserInfo> = {};
  if (draft.nickname !== baseline.value.nickname) {
    const validation = validateNickname(draft.nickname);
    if (!validation.isValid) errors.nickname = validation.message;
    else updates.nickname = draft.nickname.trim();
  }
  for (const [field, databaseField] of [
    ['spaceLink', 'space_link'],
    ['liveroomLink', 'liveroom_link'],
  ] as const) {
    if (draft[field] === baseline.value[field]) continue;
    errors[field] = validateLink(draft[field]);
    if (!errors[field]) updates[databaseField] = draft[field].trim() || null;
  }
  if (Object.values(errors).some(Boolean)) {
    await nextTick();
    document
      .querySelector<HTMLInputElement>('.profile-settings input[aria-invalid="true"]')
      ?.focus();
    return;
  }
  saving.value = true;
  try {
    if (await userStore.updateUserInfo(updates)) resetDraft();
    else saveError.value = '保存失败，请重试';
  } catch {
    saveError.value = '保存失败，请重试';
  } finally {
    saving.value = false;
  }
}
onBeforeRouteLeave(async () => {
  if (saving.value) return false;
  if (!isDirty.value) return true;
  try {
    const decision = ElMessageBox.confirm('离开后，未保存的资料修改会丢失。', '离开个人资料？', {
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
      type: 'warning',
      autofocus: false,
      distinguishCancelAndClose: true,
      cancelButtonClass: 'continue-profile-editing',
    });
    await nextTick();
    document.querySelector<HTMLButtonElement>('.continue-profile-editing')?.focus();
    await decision;
    return true;
  } catch {
    return false;
  }
});
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = '';
  }
};
window.addEventListener('beforeunload', beforeUnload);
onScopeDispose(() => window.removeEventListener('beforeunload', beforeUnload));
</script>

<style scoped>
.profile-load-error {
  display: grid;
  gap: 16px;
  justify-items: start;
  padding: 24px;
}
.profile-settings {
  width: 100%;
  padding-bottom: 24px;
}
.settings-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.3;
  font-weight: 650;
  letter-spacing: -0.03em;
}
.profile-preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  white-space: nowrap;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.profile-preview svg {
  width: 15px;
  height: 15px;
}
.profile-preview:hover {
  color: var(--text-primary);
  border-color: var(--accent);
  background: var(--panel);
}
.profile-preview:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: stretch;
}
.settings-panel {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  box-sizing: border-box;
}
.settings-panel h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}
.settings-panel > h2,
.panel-heading {
  margin-bottom: 24px;
}
.panel-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}
.settings-fields {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.settings-actions {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.settings-actions :deep(button) {
  min-width: 88px;
  min-height: 42px;
}
.settings-actions :deep(button:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.settings-actions :deep(.btn-loading) {
  min-width: 104px;
}
.save-error {
  flex: 1;
  margin: 0;
  color: #ffb4ab;
  font-size: 14px;
}
@media (max-width: 1050px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}
@media (max-width: 480px) {
  .settings-heading {
    gap: 12px;
    margin-bottom: 20px;
  }
  h1 {
    font-size: 23px;
  }
  .profile-preview {
    padding: 9px 11px;
    font-size: 13px;
  }
  .settings-panel {
    padding: 20px;
  }
  .settings-actions {
    flex-wrap: wrap;
  }
  .save-error:not(:empty) {
    flex-basis: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .profile-preview {
    transition: none;
  }
}
</style>
