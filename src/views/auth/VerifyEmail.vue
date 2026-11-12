<template>
  <AuthLayout title="验证邮箱" :error="error" :notice="notice">
    <p v-if="email" class="auth-text">
      请在邮箱中打开验证链接。<strong class="auth-mail">{{ email }}</strong>
    </p>
    <form
      class="auth-form verification-actions"
      novalidate
      :aria-busy="busy"
      @submit.prevent="resend"
      @keydown.enter="guardComposition"
    >
      <PrimaryInput
        v-if="!savedEmail"
        id="verify-email"
        v-model="email"
        label="邮箱"
        type="email"
        input-mode="email"
        autocomplete="email"
        layout="stacked"
        :disabled="busy"
        :error="errors['verify-email']"
        @input="clear('verify-email')"
      />
      <PrimaryButton type="submit" class="auth-submit" :loading="busy" :disabled="remaining > 0"
        ><LoadingIcon v-if="busy" aria-hidden="true" />{{
          remaining ? `${remaining} 秒后重新发送` : '重新发送验证邮件'
        }}</PrimaryButton
      >
    </form>
    <template #footer>
      <RouterLink :to="{ path: '/signup', query: { redirect } }">更换邮箱</RouterLink>
      <RouterLink :to="{ path: '/login', query: { redirect } }">去登录</RouterLink>
    </template>
  </AuthLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useNow } from '@vueuse/core';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import useAuthStore from '@/stores/auth';
import { authErrorMessage, emailError, normalizeEmail, safeRedirect } from '@/auth/flow';
import { authenticatedDestination } from '@/auth/navigation';
import { useAuthForm } from '@/composables/useAuthForm';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const savedEmail = auth.emailContext?.purpose === 'signup' ? auth.emailContext.email : '';
const email = ref(savedEmail);
const notice = ref('');
const redirect = computed(() => safeRedirect(route.query.redirect ?? auth.emailContext?.redirect));
const now = useNow({ interval: 1000 });
const remaining = computed(() => auth.retrySeconds(email.value, 'signup', now.value.getTime()));
const { busy, error, errors, clear, validate, run, guardComposition } = useAuthForm();
async function resend() {
  if (
    busy.value ||
    remaining.value ||
    !(await validate({ 'verify-email': emailError(email.value) }))
  )
    return;
  await run(async () => {
    const { error: reason } = await auth.sendEmail(email.value, 'signup', redirect.value);
    if (reason) error.value = authErrorMessage(reason);
    else notice.value = '如果账号尚未验证，验证邮件将发送至此邮箱';
  });
}
async function continueVerified() {
  if (auth.user?.email && normalizeEmail(auth.user.email) === normalizeEmail(email.value)) {
    const target = await authenticatedDestination(redirect.value);
    auth.clearEmailContext();
    await router.replace(target);
  }
}
watch(() => auth.user?.email, continueVerified);
onMounted(continueVerified);
</script>
<style scoped>
.verification-actions {
  margin-top: 24px;
}
</style>
