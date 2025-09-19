import { reactive, toRefs } from 'vue';

// 全局状态
const globalState = reactive({
  visible: false,
  message: '',
  type: 'info' as 'error' | 'success' | 'info',
  duration: 2000,
});

let timer: NodeJS.Timeout | null = null;

// 全局通知服务
export const notificationService = {
  showNotification: (
    message: string,
    type: 'error' | 'success' | 'info' = 'info',
    duration: number = 2000
  ) => {
    globalState.message = message;
    globalState.type = type;
    globalState.duration = duration;
    globalState.visible = true;

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer);
    }

    // 设置自动关闭定时器
    if (duration > 0) {
      timer = setTimeout(() => {
        globalState.visible = false;
      }, duration);
    }
  },

  hideNotification: () => {
    globalState.visible = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  },

  showSuccessNotification: (message: string, duration: number = 2000) => {
    notificationService.showNotification(message, 'success', duration);
  },

  showErrorNotification: (message: string, duration: number = 3000) => {
    notificationService.showNotification(message, 'error', duration);
  },

  showInfoNotification: (message: string, duration: number = 2000) => {
    notificationService.showNotification(message, 'info', duration);
  },
};

// Hook 用于在组件中使用
export const useNotification = () => {
  return {
    ...toRefs(globalState),

    // 方法
    showNotification: notificationService.showNotification,
    hideNotification: notificationService.hideNotification,
    showSuccessNotification: notificationService.showSuccessNotification,
    showErrorNotification: notificationService.showErrorNotification,
    showInfoNotification: notificationService.showInfoNotification,
  };
};
