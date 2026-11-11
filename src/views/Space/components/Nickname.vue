<template>
  <section class="account-setup" aria-labelledby="account-setup-title">
    <h2 id="account-setup-title">关联榜单账号</h2>
    <div class="setup-options">
      <form
        novalidate
        class="setup-option"
        :aria-busy="busy"
        @submit.prevent="handleBinding"
        @keydown.enter="guardComposition"
      >
        <div class="option-heading">
          <h3>已有榜单成绩</h3>
          <InfoHint
            text="选择之前提交成绩时使用的昵称，将已有记录关联到当前账号。找不到或关联有误时，请联系管理员。"
          />
        </div>
        <label for="existing-leaderboard-user">榜单昵称</label>
        <SearchSelect
          input-id="existing-leaderboard-user"
          v-model="selectedUser"
          :options="unbindedUserList"
          option-key="id"
          option-label="nickname"
          :search-fields="['nickname']"
          placeholder="搜索原来的昵称"
          title="榜单昵称"
          :disabled="busy || listLoading"
          @search="bindingQuery = $event"
          @select="bindingQuery = $event.nickname"
        />
        <div v-if="listError" class="list-error" role="alert">
          <span>{{ listError }}</span
          ><PrimaryButton variant="clear" size="small" @click="getUnbindedUser">重试</PrimaryButton>
        </div>
        <PrimaryButton
          type="submit"
          :disabled="!hasCommittedSelection || busy || listLoading"
          :loading="activeAction === 'existing'"
          >关联账号</PrimaryButton
        >
      </form>
      <form
        novalidate
        class="setup-option"
        :aria-busy="busy"
        @submit.prevent="handleNewUserBinding"
        @keydown.enter="guardComposition"
      >
        <div class="option-heading">
          <h3>首次使用</h3>
          <InfoHint text="没有提交过榜单成绩时，可创建个人资料。昵称将显示在排行榜上。" />
        </div>
        <PrimaryInput
          id="new-leaderboard-user"
          v-model="newUserNickname"
          label="昵称"
          layout="stacked"
          placeholder="填写榜单使用的昵称"
          :max-length="50"
          :disabled="busy"
          :error="nicknameError"
        />
        <PrimaryButton
          type="submit"
          :disabled="!newUserNickname.trim() || busy"
          :loading="activeAction === 'new'"
          >创建资料</PrimaryButton
        >
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import useUserStore from '@/stores/user';
import { sanitizeInput, validateNickname } from '@/utils/security';
import SearchSelect from '@/components/common/SearchSelect.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import InfoHint from '@/components/common/InfoHint.vue';

const userStore = useUserStore();
const unbindedUserList = ref<{ id: number; nickname: string }[]>([]);
const selectedUser = ref<{ id: number; nickname: string } | null>(null);
const bindingQuery = ref('');
const hasCommittedSelection = computed(
  () => selectedUser.value?.nickname === bindingQuery.value && !!selectedUser.value
);
const newUserNickname = ref('');
const nicknameError = ref('');
const listError = ref('');
const listLoading = ref(false);
const activeAction = ref<'existing' | 'new' | null>(null);
const busy = computed(() => activeAction.value !== null);

async function getUnbindedUser() {
  if (listLoading.value) return;
  listLoading.value = true;
  listError.value = '';
  try {
    const { data, error } = await supabase.from('users').select('id,nickname').is('user_id', null);
    if (error) throw error;
    unbindedUserList.value = data ?? [];
  } catch {
    listError.value = '昵称列表加载失败';
  } finally {
    listLoading.value = false;
  }
}
async function handleBinding() {
  if (!selectedUser.value || !hasCommittedSelection.value || busy.value || listLoading.value)
    return;
  activeAction.value = 'existing';
  try {
    await userStore.bindUser(selectedUser.value.id);
  } finally {
    activeAction.value = null;
  }
}
async function handleNewUserBinding() {
  if (busy.value) return;
  const validation = validateNickname(newUserNickname.value);
  nicknameError.value = validation.isValid ? '' : validation.message;
  if (!validation.isValid) {
    document.getElementById('new-leaderboard-user')?.focus();
    return;
  }
  activeAction.value = 'new';
  try {
    await userStore.createNewUser(sanitizeInput(newUserNickname.value.trim()));
    if (userStore.isBinding) newUserNickname.value = '';
  } finally {
    activeAction.value = null;
  }
}
onMounted(getUnbindedUser);
const guardComposition = (event: KeyboardEvent) => {
  if (event.isComposing) event.preventDefault();
};
</script>

<style scoped>
.account-setup {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
}
h2 {
  margin: 0 0 28px;
  font-size: 18px;
  font-weight: 600;
}
.setup-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 32px;
}
.setup-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  gap: 12px;
}
.setup-option + .setup-option {
  padding-left: 32px;
  border-left: 1px solid var(--border);
}
.option-heading {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
h3 {
  font-size: 15px;
  font-weight: 600;
}
label {
  color: var(--text-secondary);
  font-size: 14px;
}
.setup-option :deep(.primary-input-container),
.setup-option :deep(.search-select-container) {
  width: 100%;
  min-width: 0;
}
.setup-option :deep(.search-select-input) {
  width: 100%;
  box-sizing: border-box;
  background: var(--bgcolor);
  border-color: var(--border-light);
}
.setup-option > :deep(button) {
  margin-top: 4px;
  min-height: 40px;
}
.list-error {
  display: flex;
  align-items: center;
  gap: 12px;
}
.list-error span {
  color: #ffb4ab;
  font-size: 13px;
}
@media (max-width: 1050px) {
  .setup-options {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .setup-option + .setup-option {
    padding: 28px 0 0;
    border-left: 0;
    border-top: 1px solid var(--border);
  }
}
@media (max-width: 480px) {
  .account-setup {
    padding: 20px;
  }
}
</style>
