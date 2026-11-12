<template>
  <AuthLayout :title="failed ? '验证未完成' : '正在验证邮箱'" :error="failed">
    <div v-if="!failed" class="callback-loading" role="status"><Loading /></div>
    <div v-else class="auth-form">
      <RouterLink
        class="callback-action"
        :to="{ path: isRecovery ? '/forgot-password' : '/verify-email', query: { redirect } }"
        >{{ isRecovery ? '重新申请重置邮件' : '重新发送验证邮件' }}</RouterLink
      >
      <RouterLink class="auth-text" :to="{ path: '/login', query: { redirect } }"
        >返回登录</RouterLink
      >
    </div>
  </AuthLayout>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import useAuthStore from '@/stores/auth';
import { initialAuthCallback } from '@/lib/supabaseClient';
import { clearCallbackParameters, safeRedirect } from '@/auth/flow';
import { authenticatedDestination } from '@/auth/navigation';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import Loading from '@/components/common/Loading.vue';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const failed = ref('');
const isRecovery = computed(() => route.query.flow === 'recovery' || initialAuthCallback.recovery);
const redirect = computed(() => safeRedirect(route.query.redirect ?? auth.emailContext?.redirect));
let finishing = false;
let recoveryWait: ReturnType<typeof setTimeout> | undefined;
async function finish() {
  if (finishing || !auth.initialized) return;
  if (auth.callbackError || !initialAuthCallback.present || !auth.isLoggedIn) {
    failed.value = auth.callbackError || '邮件链接已失效，请重新申请';
    clearCallbackParameters();
    return;
  }
  if (isRecovery.value && !auth.recovery) {
    recoveryWait ??= setTimeout(() => {
      if (!finishing) {
        failed.value = '邮件链接已失效，请重新申请';
        clearCallbackParameters();
      }
    }, 5_000);
    return;
  }
  clearTimeout(recoveryWait);
  finishing = true;
  clearCallbackParameters();
  if (isRecovery.value)
    await router.replace({ path: '/reset-password', query: { redirect: redirect.value } });
  else {
    const target = await authenticatedDestination(redirect.value);
    auth.clearEmailContext();
    await router.replace(target);
  }
}
watch(() => auth.recovery, finish);
onMounted(async () => {
  await auth.initializeAuth();
  await finish();
});
onUnmounted(() => clearTimeout(recoveryWait));
</script>
<style scoped>
.callback-loading {
  min-height: 96px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.callback-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 8px;
  background: var(--accent-dark);
}
.callback-action:hover {
  background: var(--accent-strong);
  color: var(--text-primary);
}
.callback-action:focus-visible {
  outline: 2px solid var(--accent-bright);
  outline-offset: 3px;
}
</style>
