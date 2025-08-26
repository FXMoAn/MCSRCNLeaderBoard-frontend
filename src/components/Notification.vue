<template>
  <Transition name="notification">
    <div v-if="visible" class="notification" :class="type">
      <div class="notification-content">
        <span class="notification-icon">
          <span v-if="type === 'error'">⚠️</span>
          <span v-else-if="type === 'success'">✅</span>
          <span v-else>ℹ️</span>
        </span>
        <span class="notification-text">{{ message }}</span>
        <button class="notification-close" @click="close">×</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  message: string;
  type?: 'error' | 'success' | 'info';
  duration?: number;
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', visible: boolean): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 0
});

const emit = defineEmits<Emits>();

const visible = ref(props.visible);

watch(() => props.visible, (newVal) => {
  visible.value = newVal;
});

watch(visible, (newVal) => {
  emit('update:visible', newVal);
});

const close = () => {
  visible.value = false;
  emit('close');
};

watch(visible, (newVal) => {
  if (newVal && props.duration > 0) {
    setTimeout(() => {
      close();
    }, props.duration);
  }
});
</script>

<style scoped>
.notification {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  max-width: 90%;
  min-width: 300px;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid;
  font-weight: 500;
}

.notification.error {
  background-color: #ff4444;
  color: white;
  border-color: #ff6666;
}

.notification.success {
  background-color: #4caf50;
  color: white;
  border-color: #66bb6a;
}

.notification.info {
  background-color: #2196f3;
  color: white;
  border-color: #42a5f5;
}

.notification-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.notification-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

@media (max-width: 768px) {
  .notification {
    min-width: 280px;
    max-width: 95%;
  }
  
  .notification-content {
    padding: 14px 16px;
    gap: 10px;
  }
  
  .notification-text {
    font-size: 13px;
  }
  
  .notification-close {
    width: 20px;
    height: 20px;
    font-size: 18px;
  }
}
</style>
