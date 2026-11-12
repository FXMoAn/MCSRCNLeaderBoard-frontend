<template>
  <AuthLayout title="注册账号" :error="error">
    <form
      class="auth-form"
      novalidate
      :aria-busy="busy"
      @submit.prevent="submit"
      @keydown.enter="guardComposition"
    >
      <PrimaryInput
        id="signup-email"
        v-model="email"
        label="邮箱"
        name="email"
        type="email"
        input-mode="email"
        autocomplete="username"
        placeholder="请输入邮箱"
        layout="stacked"
        :disabled="busy"
        :error="errors['signup-email']"
        @input="clear('signup-email')"
      />
      <PrimaryInput
        id="signup-password"
        v-model="password"
        label="密码"
        name="password"
        type="password"
        autocomplete="new-password"
        :placeholder="`至少 ${MIN_PASSWORD_LENGTH} 位`"
        layout="stacked"
        password-toggle
        :disabled="busy"
        :error="errors['signup-password']"
        @input="clear('signup-password')"
      />
      <PrimaryInput
        id="signup-confirm"
        v-model="confirmation"
        label="确认密码"
        name="password-confirmation"
        type="password"
        autocomplete="new-password"
        placeholder="再次输入密码"
        layout="stacked"
        password-toggle
        :disabled="busy"
        :error="errors['signup-confirm']"
        @input="clear('signup-confirm')"
      />
      <PrimaryButton type="submit" class="auth-submit" :loading="busy" :disabled="remaining > 0"
        ><LoadingIcon v-if="busy" aria-hidden="true" />{{
          remaining > 0 ? `注册（${remaining}秒）` : '注册'
        }}</PrimaryButton
      >
    </form>
    <template #footer
      ><RouterLink :to="{ path: '/login', query: { redirect } }"
        >已有账号？去登录</RouterLink
      ></template
    >
  </AuthLayout>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNow } from '@vueuse/core';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import useAuthStore from '@/stores/auth';
import {
  MIN_PASSWORD_LENGTH,
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
const confirmation = ref('');
const redirect = computed(() => safeRedirect(route.query.redirect));
const now = useNow({ interval: 1000 });
const remaining = computed(() => auth.retrySeconds(email.value, 'signup', now.value.getTime()));
const { busy, error, errors, clear, validate, run, guardComposition } = useAuthForm();
async function submit() {
  if (
    busy.value ||
    remaining.value ||
    !(await validate({
      'signup-email': emailError(email.value),
      'signup-password': passwordError(password.value, true),
      'signup-confirm':
        confirmation.value === password.value && !!confirmation.value ? '' : '两次输入的密码不一致',
    }))
  )
    return;
  await run(async () => {
    const result = await auth.signup(email.value, password.value, redirect.value);
    if (result.error) {
      error.value = authErrorMessage(result.error);
      return;
    }
    password.value = '';
    confirmation.value = '';
    await router.replace(
      result.data?.session
        ? await authenticatedDestination(redirect.value)
        : { path: '/verify-email', query: { redirect: redirect.value } }
    );
  });
}
</script>
