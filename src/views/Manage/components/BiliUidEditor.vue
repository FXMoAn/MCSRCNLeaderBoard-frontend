<template>
  <section
    v-if="userStore.isAdmin"
    id="bilibili"
    ref="section"
    class="bili-editor"
    aria-labelledby="bili-editor-heading"
  >
    <header class="editor-heading">
      <h2 id="bili-editor-heading">B 站账号关联</h2>
      <InfoHint text="该 UID 用于关联历史成绩，仅管理员可以修改。" />
    </header>
    <form novalidate :aria-busy="saving" @submit.prevent="save" @keydown.enter="guardComposition">
      <div class="editor-fields">
        <div class="player-field">
          <label for="bili-editor-player">玩家</label>
          <SearchSelect
            input-id="bili-editor-player"
            v-model="selected"
            :options="users"
            option-key="id"
            option-label="nickname"
            :search-fields="['nickname']"
            placeholder="选择玩家"
            title="玩家"
            :disabled="loading || saving"
            @search="selectionQuery = $event"
            @select="selectionQuery = $event.nickname"
          />
        </div>
        <template v-if="hasSelection && originalUid">
          <PrimaryInput
            id="bili-editor-uid"
            v-model="draftUid"
            label="B 站 UID"
            layout="stacked"
            placeholder="数字 UID"
            :max-length="20"
            :disabled="saving"
            :error="fieldError"
            @update:modelValue="clearInputError"
          />
          <PrimaryButton
            class="save-uid"
            type="submit"
            :loading="saving"
            :disabled="draftUid.trim() === originalUid || needsReload"
            >保存 UID</PrimaryButton
          >
        </template>
      </div>
      <p v-if="hasSelection && !originalUid" class="empty-uid" role="status">
        该玩家未保存 B 站 UID
      </p>
      <div v-if="loadError || requestError" class="editor-error" role="alert">
        <span>{{ loadError || requestError }}</span>
        <PrimaryButton
          v-if="loadError || needsReload"
          variant="clear"
          size="small"
          :disabled="loading || saving"
          @click="reload"
          >重新载入</PrimaryButton
        >
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '@/lib/supabaseClient';
import useUserStore from '@/stores/user';
import { showSuccessNotification } from '@/utils/notification';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import SearchSelect from '@/components/common/SearchSelect.vue';
import InfoHint from '@/components/common/InfoHint.vue';

interface Player {
  id: number;
  nickname: string;
  bili_id: string | null;
}
const props = defineProps<{ users: Player[]; loading: boolean; loadError: string }>();
const emit = defineEmits<{ refresh: []; saved: [player: Player] }>();
const userStore = useUserStore();
const route = useRoute();
const section = ref<HTMLElement>();
const selected = ref<Player | null>(null);
const selectionQuery = ref('');
const originalUid = ref('');
const draftUid = ref('');
const fieldError = ref('');
const requestError = ref('');
const needsReload = ref(false);
const saving = ref(false);
const hasSelection = computed(
  () => !!selected.value && selectionQuery.value === selected.value.nickname
);
let prefilledId = '';
let reloadSelection = false;
let selectionVersion = 0;

watch(
  () => route.query.userId,
  () => {
    prefilledId = '';
  },
  { flush: 'sync' }
);

function selectPlayer(player: Player | null) {
  selected.value = player;
  selectionQuery.value = player?.nickname ?? '';
}
watch(
  () => selected.value?.id,
  () => {
    selectionVersion++;
    originalUid.value = selected.value?.bili_id?.trim() ?? '';
    draftUid.value = originalUid.value;
    fieldError.value = '';
    requestError.value = '';
    needsReload.value = false;
  }
);

watch(
  () => [route.query.userId, props.users, props.loading, saving.value] as const,
  async () => {
    if (props.loading || saving.value) return;
    const target = typeof route.query.userId === 'string' ? route.query.userId : '';
    if (reloadSelection) {
      const latest = props.users.find((player) => player.id === selected.value?.id) ?? null;
      selectPlayer(latest);
      originalUid.value = latest?.bili_id?.trim() ?? '';
      draftUid.value = originalUid.value;
      fieldError.value = '';
      requestError.value = '';
      needsReload.value = false;
      reloadSelection = false;
    }
    if (!/^[1-9]\d*$/.test(target) || prefilledId === target || !props.users.length) return;
    prefilledId = target;
    selectPlayer(props.users.find((player) => String(player.id) === target) ?? null);
    await nextTick();
    if (route.hash === '#bilibili') section.value?.scrollIntoView({ block: 'start' });
  },
  { immediate: true }
);

function reload() {
  reloadSelection = true;
  emit('refresh');
}
function clearInputError() {
  fieldError.value = '';
  if (!needsReload.value) requestError.value = '';
}
function guardComposition(event: KeyboardEvent) {
  if (event.isComposing) event.preventDefault();
}

async function save() {
  if (
    saving.value ||
    needsReload.value ||
    !userStore.isAdmin ||
    !hasSelection.value ||
    !selected.value ||
    !originalUid.value
  )
    return;
  const uid = draftUid.value.trim();
  fieldError.value = '';
  requestError.value = '';
  needsReload.value = false;
  if (!/^[1-9]\d{0,19}$/.test(uid)) {
    fieldError.value = '请输入不以 0 开头的数字 UID';
    await nextTick();
    document.getElementById('bili-editor-uid')?.focus();
    return;
  }
  if (uid === originalUid.value) return;
  const actor = userStore.localUserId;
  const target = selected.value;
  const version = selectionVersion;
  saving.value = true;
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ bili_id: uid })
      .eq('id', target.id)
      .eq('bili_id', originalUid.value)
      .select('id,nickname,bili_id')
      .maybeSingle();
    if (userStore.localUserId !== actor || !userStore.isAdmin || selectionVersion !== version)
      return;
    if (error) {
      requestError.value =
        error.code === '23505'
          ? '该 UID 已关联其他玩家'
          : error.code === '42501'
            ? '仅管理员可以修改 B 站 UID'
            : '保存失败，请重试';
      return;
    }
    if (!data) {
      requestError.value = '关联信息已变化，请重新载入后再修改';
      needsReload.value = true;
      return;
    }
    selected.value = data;
    selectionQuery.value = data.nickname;
    originalUid.value = data.bili_id ?? '';
    draftUid.value = originalUid.value;
    emit('saved', data);
    if (data.id === userStore.userInfo.id)
      userStore.setUserInfo({ ...userStore.userInfo, bili_id: data.bili_id });
    showSuccessNotification('B 站 UID 已更新');
  } catch {
    if (userStore.localUserId === actor && selectionVersion === version)
      requestError.value = '保存失败，请重试';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.bili-editor {
  padding: 24px;
  margin-bottom: 30px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  scroll-margin-top: 80px;
}
.editor-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
}
h2 {
  margin: 0;
  font-size: 17px;
  line-height: 24px;
  font-weight: 600;
}
.editor-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
}
.player-field {
  min-width: 0;
}
.player-field label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 20px;
}
.player-field :deep(.search-select-input) {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  background: var(--bgcolor);
  border-color: var(--border-light);
}
.save-uid {
  margin-top: 28px;
  min-width: 108px;
  min-height: 44px;
}
.empty-uid {
  margin: 16px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}
.editor-error {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.editor-error span {
  color: #ffb4ab;
  font-size: 14px;
}
.save-uid:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
@media (max-width: 1050px) {
  .editor-fields {
    grid-template-columns: minmax(0, 1fr);
  }
  .save-uid {
    margin-top: 0;
    justify-self: start;
  }
}
@media (max-width: 480px) {
  .bili-editor {
    padding: 20px;
  }
}
</style>
