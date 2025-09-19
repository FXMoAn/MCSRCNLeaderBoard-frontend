// 全局通知服务
// 这个文件提供了全局的通知服务，可以在任何地方直接调用

import { notificationService } from '@/hooks/useNotification';

// 导出通知服务，方便全局使用
export const notify = notificationService;

// 也可以导出具体的通知方法，使用更简洁
export const {
  showNotification,
  hideNotification,
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
} = notificationService;

// 默认导出
export default notificationService;
