<template>
  <AuthLayout :title="changed ? '密码已更新' : '重置密码'" :error="error">
    <form
      v-if="auth.recovery && auth.isLoggedIn && !changed"
      class="auth-form"
      novalidate
      :aria-busy="busy"
      @submit.prevent="submit"
      @keydown.enter="guardComposition"
    >
      <PrimaryInput
        id="reset-password"
        v-model="password"
        name="password"
        label="新密码"
        type="password"
        autocomplete="new-password"
        :placeholder="`至少 ${MIN_PASSWORD_LENGTH} 位`"
        layout="stacked"
        password-toggle
        :disabled="busy"
        :error="errors['reset-password']"
        @input="clear('reset-password')"
      />
      <PrimaryInput
        id="reset-confirm"
        v-model="confirmation"
        name="password-confirmation"
        label="确认新密码"
        type="password"
        autocomplete="new-password"
        placeholder="再次输入新密码"
        layout="stacked"
        password-toggle
        :disabled="busy"
        :error="errors['reset-confirm']"
        @input="clear('reset-confirm')"
      />
      <PrimaryButton type="submit" class="auth-submit" :loading="busy"
        ><LoadingIcon v-if="busy" aria-hidden="true" />更新密码</PrimaryButton
      >
    </form>
    <div v-else-if="changed" class="auth-form">
      <p class="auth-text">密码已更新。请退出当前登录后重新登录。</p>
      <PrimaryButton class="auth-submit" :loading="busy" @click="run(finishLogout)"
        >退出并重新登录</PrimaryButton
      >
    </div>
    <div v-else class="auth-form">
      <p class="auth-text">请从有效的密码重置邮件进入此页面。</p>
      <RouterLink class="reset-link" :to="{ path: '/forgot-password', query: { redirect } }"
        >重新申请重置邮件</RouterLink
      >
    </div>
    <template #footer
      ><RouterLink :to="{ path: '/login', query: { redirect } }">返回登录</RouterLink></template
    >
  </AuthLayout>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import useAuthStore from '@/stores/auth';
import {
  MIN_PASSWORD_LENGTH,
  authErrorMessage,
  passwordError,
  safeRedirect,
  clearCallbackParameters,
} from '@/auth/flow';
import { useAuthForm } from '@/composables/useAuthForm';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const redirect = computed(() => safeRedirect(route.query.redirect));
const password = ref('');
const confirmation = ref('');
const changed = ref(false);
const { busy, error, errors, clear, validate, run, guardComposition } = useAuthForm();
clearCallbackParameters();
async function finishLogout() {
  const { error: reason } = await auth.logout();
  if (reason) {
    error.value = '密码已更新，退出登录失败，请重试';
    return;
  }
  await router.replace({ path: '/login', query: { passwordReset: '1', redirect: redirect.value } });
}
async function submit() {
  if (
    busy.value ||
    !(await validate({
      'reset-password': passwordError(password.value, true),
      'reset-confirm':
        confirmation.value && confirmation.value === password.value ? '' : '两次输入的密码不一致',
    }))
  )
    return;
  await run(async () => {
    const { error: reason } = await auth.updatePassword(password.value);
    if (reason) {
      error.value = authErrorMessage(reason);
      return;
    }
    password.value = '';
    confirmation.value = '';
    changed.value = true;
    await finishLogout();
  });
}
</script>
<style scoped>
.reset-link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  background: var(--accent-dark);
  border-radius: 8px;
}
.reset-link:hover {
  background: var(--accent-strong);
  color: var(--text-primary);
}
.reset-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
