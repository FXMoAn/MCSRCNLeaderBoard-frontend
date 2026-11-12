<template>
  <section class="auth-page" :aria-labelledby="headingId">
    <div class="auth-card">
      <h1 :id="headingId">{{ title }}</h1>
      <slot name="description" />
      <div class="auth-feedback" :class="{ 'auth-feedback-error': !!error }">
        <p :role="error ? 'alert' : 'status'" aria-live="polite">{{ error || notice }}</p>
      </div>
      <slot />
      <footer v-if="$slots.footer" class="auth-footer"><slot name="footer" /></footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';
defineProps<{ title: string; error?: string; notice?: string }>();
const headingId = useId();
</script>

<style scoped>
.auth-page {
  width: 100%;
  max-width: 440px;
  margin: clamp(24px, 6vh, 64px) auto;
  padding: 0 16px;
  box-sizing: border-box;
  min-width: 0;
}
.auth-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px;
}
h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  margin: 0;
}
.auth-feedback {
  min-height: 24px;
  margin: 16px 0 12px;
  font-size: 14px;
  line-height: 22px;
}
.auth-feedback p {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.auth-feedback-error p {
  color: #ffb4ab;
}
.auth-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 14px;
}
.auth-footer :deep(a),
.auth-footer :deep(button) {
  color: var(--accent-bright);
}
.auth-footer :deep(a:hover) {
  color: var(--text-primary);
}
.auth-footer :deep(a:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 2px;
}
:deep(.auth-form) {
  display: grid;
  gap: 20px;
}
:deep(.auth-submit) {
  position: relative;
  min-height: 44px;
  width: 100%;
}
:deep(.auth-submit svg) {
  position: absolute;
  left: 16px;
  width: 18px;
  height: 18px;
  animation: auth-spin 1s linear infinite;
}
:deep(.auth-text) {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
:deep(.auth-mail) {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
  margin-top: 6px;
  overflow-wrap: anywhere;
}
@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 480px) {
  .auth-card {
    padding: 24px 20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  :deep(.auth-submit svg) {
    animation: none;
  }
}
</style>
