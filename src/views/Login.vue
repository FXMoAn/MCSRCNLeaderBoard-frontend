<template>
  <AuthLayout
    title="登录"
    :error="error || auth.initializationError"
    :notice="route.query.passwordReset === '1' ? '密码已更新，请重新登录' : ''"
  >
    <form
      class="auth-form"
      novalidate
      :aria-busy="busy"
      @submit.prevent="submit"
      @keydown.enter="guardComposition"
    >
      <PrimaryInput
        id="login-email"
        v-model="email"
        name="email"
        label="邮箱"
        type="email"
        input-mode="email"
        autocomplete="username"
        placeholder="请输入邮箱"
        layout="stacked"
        :disabled="busy"
        :error="errors['login-email']"
        @input="clear('login-email')"
      />
      <PrimaryInput
        id="login-password"
        v-model="password"
        name="password"
        label="密码"
        type="password"
        autocomplete="current-password"
        placeholder="请输入密码"
        layout="stacked"
        password-toggle
        :disabled="busy"
        :error="errors['login-password']"
        @input="clear('login-password')"
      />
      <PrimaryButton type="submit" class="auth-submit" :loading="busy"
        ><LoadingIcon v-if="busy" aria-hidden="true" />登录</PrimaryButton
      >
      <PrimaryButton
        v-if="auth.initializationError"
        variant="clear"
        :disabled="busy"
        @click="auth.initializeAuth(true)"
        >重试恢复登录</PrimaryButton
      >
      <RouterLink
        v-if="unconfirmed"
        :to="{ path: '/verify-email', query: { redirect } }"
        class="auth-text"
        >重新发送验证邮件</RouterLink
      >
    </form>
    <template #footer>
      <RouterLink :to="{ path: '/signup', query: { redirect } }">注册账号</RouterLink>
      <RouterLink :to="{ path: '/forgot-password', query: { redirect } }">忘记密码</RouterLink>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import useAuthStore from '@/stores/auth';
import {
  authErrorCode,
  authErrorMessage,
  emailError,
  passwordError,
  safeRedirect,
} from '@/auth/flow';
import { authenticatedDestination } from '@/auth/navigation';
import { useAuthForm } from '@/composables/useAuthForm';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref(auth.emailContext?.email ?? '');
const password = ref('');
const unconfirmed = ref(false);
const redirect = computed(() => safeRedirect(route.query.redirect));
const { busy, error, errors, clear, validate, run, guardComposition } = useAuthForm();
async function submit() {
  if (
    busy.value ||
    !(await validate({
      'login-email': emailError(email.value),
      'login-password': passwordError(password.value),
    }))
  )
    return;
  await run(async () => {
    unconfirmed.value = false;
    const result = await auth.login(email.value, password.value);
    if (result.error) {
      error.value = authErrorMessage(result.error);
      if (authErrorCode(result.error) === 'email_not_confirmed') {
        unconfirmed.value = true;
        auth.rememberEmail(email.value, 'signup', redirect.value, false);
      }
      return;
    }
    password.value = '';
    await router.replace(await authenticatedDestination(redirect.value));
  });
}
watch(
  () => auth.user?.id,
  async (owner) => {
    if (owner && !busy.value && !auth.recovery)
      await router.replace(await authenticatedDestination(redirect.value));
  }
);
</script>
