import { ref } from "vue";

type EventCallback = (...args: any[]) => void;

class EventBus {
  private events = ref<Map<string, EventCallback[]>>(new Map());

  // 订阅事件
  on(event: string, callback: EventCallback) {
    if (!this.events.value.has(event)) {
      this.events.value.set(event, []);
    }
    this.events.value.get(event)!.push(callback);
  }

  // 取消订阅
  off(event: string, callback: EventCallback) {
    const callbacks = this.events.value.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 发布事件
  emit(event: string, ...args: any[]) {
    const callbacks = this.events.value.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`事件 ${event} 处理出错:`, error);
        }
      });
    }
  }

  // 清理所有事件
  clear() {
    this.events.value.clear();
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

// 定义事件类型常量
export const AUTH_EVENTS = {
  USER_LOGGED_IN: "user:logged_in",
  USER_LOGGED_OUT: "user:logged_out",
  USER_INFO_UPDATED: "user:info_updated",
  SESSION_EXPIRED: "session:expired",
} as const;

export default eventBus;
