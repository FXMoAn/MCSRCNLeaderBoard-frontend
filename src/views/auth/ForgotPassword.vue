<template>
  <AuthLayout :title="sent ? '检查邮箱' : '找回密码'" :error="error" :notice="notice">
    <form
      v-if="!sent"
      class="auth-form"
      novalidate
      :aria-busy="busy"
      @submit.prevent="send"
      @keydown.enter="guardComposition"
    >
      <PrimaryInput
        id="recovery-email"
        v-model="email"
        label="邮箱"
        name="email"
        type="email"
        input-mode="email"
        autocomplete="email"
        placeholder="注册时使用的邮箱"
        layout="stacked"
        :disabled="busy"
        :error="errors['recovery-email']"
        @input="clear('recovery-email')"
      />
      <PrimaryButton type="submit" class="auth-submit" :loading="busy" :disabled="remaining > 0"
        ><LoadingIcon v-if="busy" aria-hidden="true" />{{
          remaining ? `${remaining} 秒后重新发送` : '发送重置邮件'
        }}</PrimaryButton
      >
    </form>
    <div v-else class="auth-form">
      <p class="auth-text">
        若邮箱已注册，重置链接将发送至<strong class="auth-mail">{{ email }}</strong>
      </p>
      <PrimaryButton class="auth-submit" :loading="busy" :disabled="remaining > 0" @click="send"
        ><LoadingIcon v-if="busy" aria-hidden="true" />{{
          remaining ? `${remaining} 秒后重新发送` : '重新发送'
        }}</PrimaryButton
      >
      <PrimaryButton variant="clear" :disabled="busy" @click="changeEmail">更换邮箱</PrimaryButton>
    </div>
    <template #footer
      ><RouterLink :to="{ path: '/login', query: { redirect } }">返回登录</RouterLink></template
    >
  </AuthLayout>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNow } from '@vueuse/core';
import { RouterLink, useRoute } from 'vue-router';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import useAuthStore from '@/stores/auth';
import { authErrorMessage, emailError, safeRedirect } from '@/auth/flow';
import { useAuthForm } from '@/composables/useAuthForm';
import AuthLayout from '@/components/auth/AuthLayout.vue';
import PrimaryInput from '@/components/common/PrimaryInput.vue';
import PrimaryButton from '@/components/common/PrimaryButton.vue';
const auth = useAuthStore();
const route = useRoute();
const email = ref(auth.emailContext?.email ?? '');
const sent = ref(auth.emailContext?.purpose === 'recovery');
const notice = ref('');
const redirect = computed(() => safeRedirect(route.query.redirect ?? auth.emailContext?.redirect));
const now = useNow({ interval: 1000 });
const remaining = computed(() => auth.retrySeconds(email.value, 'recovery', now.value.getTime()));
const { busy, error, errors, clear, validate, run, guardComposition } = useAuthForm();
async function send() {
  if (
    busy.value ||
    remaining.value ||
    !(await validate({ 'recovery-email': emailError(email.value) }))
  )
    return;
  await run(async () => {
    const { error: reason } = await auth.sendEmail(email.value, 'recovery', redirect.value);
    if (reason) error.value = authErrorMessage(reason);
    else {
      sent.value = true;
      notice.value = '可在邮件中继续重置密码';
    }
  });
}
function changeEmail() {
  sent.value = false;
  error.value = '';
  notice.value = '';
}
</script>
