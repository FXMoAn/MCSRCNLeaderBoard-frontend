import { ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

export interface StateConfig<T> {
  // 状态对象的默认值
  defaultState: T;
  // 哪些字段需要同步到URL
  urlFields: (keyof T)[];
  // 字段值的转换器（可选）
  transformers?: {
    [K in keyof T]?: {
      toUrl: (value: T[K]) => string;
      fromUrl: (value: string) => T[K];
    };
  };
  // 本地存储键名（可选）
  storageKey?: string;
  // 本地存储过期时间（毫秒，可选）
  storageExpiry?: number;
}

export class URLStateManager<T extends Record<string, any>> {
  private router: ReturnType<typeof useRouter>;
  private route: ReturnType<typeof useRoute>;
  private config: StateConfig<T>;
  private state: Ref<T>;
  private isInitialized = false;

  constructor(config: StateConfig<T>) {
    this.config = config;
    this.router = useRouter();
    this.route = useRoute();
    this.state = ref(config.defaultState) as Ref<T>;
  }

  /**
   * 获取状态值
   */
  getState(): Ref<T> {
    return this.state;
  }

  /**
   * 获取特定字段值
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state.value[key];
  }

  /**
   * 设置状态值
   */
  set<K extends keyof T>(key: K, value: T[K], updateUrl: boolean = true): void {
    this.state.value[key] = value;

    if (updateUrl && this.config.urlFields.includes(key)) {
      this.updateURL();
    }
  }

  /**
   * 批量更新状态
   */
  setMultiple(updates: Partial<T>, updateUrl: boolean = true): void {
    Object.assign(this.state.value, updates);

    if (updateUrl) {
      this.updateURL();
    }
  }

  /**
   * 从URL恢复状态
   */
  restoreFromURL(): T {
    const query = this.route.query;
    const restored = { ...this.config.defaultState };

    for (const field of this.config.urlFields) {
      const urlValue = query[field as string];
      if (urlValue !== undefined) {
        const transformer = this.config.transformers?.[field];
        if (transformer) {
          restored[field] = transformer.fromUrl(urlValue as string);
        } else {
          // 默认转换逻辑
          restored[field] = this.convertFromUrl(urlValue as string, restored[field]);
        }
      }
    }

    // 同步到本地状态
    Object.assign(this.state.value, restored);
    this.isInitialized = true;

    return restored;
  }

  /**
   * 更新URL
   */
  private updateURL(): void {
    const newQuery = { ...this.route.query };

    // 更新URL字段
    for (const field of this.config.urlFields) {
      const value = this.state.value[field];
      const transformer = this.config.transformers?.[field];

      if (transformer) {
        newQuery[field as string] = transformer.toUrl(value);
      } else {
        // 默认转换逻辑
        newQuery[field as string] = this.convertToUrl(value);
      }
    }

    // 过滤空值
    Object.keys(newQuery).forEach((key) => {
      if (newQuery[key] === '' || newQuery[key] === undefined || newQuery[key] === null) {
        delete newQuery[key];
      }
    });

    this.router.replace({ query: newQuery });
  }

  /**
   * 保存到本地存储
   */
  saveToStorage(): void {
    if (!this.config.storageKey) return;

    const storageData = {
      state: this.state.value,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
    }
  }

  /**
   * 从本地存储恢复
   */
  restoreFromStorage(): T | null {
    if (!this.config.storageKey) return null;

    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved) {
        const data = JSON.parse(saved);

        // 检查是否过期
        if (this.config.storageExpiry && Date.now() - data.timestamp > this.config.storageExpiry) {
          localStorage.removeItem(this.config.storageKey);
          return null;
        }

        return data.state;
      }
    } catch (error) {
      console.warn('Failed to restore state from localStorage:', error);
    }

    return null;
  }

  /**
   * 初始化状态管理器
   */
  initialize(): T {
    if (this.isInitialized) {
      return this.state.value;
    }

    // 1. 优先从URL恢复
    const urlState = this.restoreFromURL();

    // 2. 如果URL没有完整状态，从本地存储恢复
    if (!this.hasCompleteURLState()) {
      const storageState = this.restoreFromStorage();
      if (storageState) {
        // 合并URL状态和存储状态
        const mergedState = { ...storageState, ...urlState };
        Object.assign(this.state.value, mergedState);

        // 同步到URL
        this.updateURL();
        return mergedState;
      }
    }

    return urlState;
  }

  /**
   * 检查URL是否有完整的状态
   */
  private hasCompleteURLState(): boolean {
    return this.config.urlFields.every((field) => this.route.query[field as string] !== undefined);
  }

  /**
   * 默认URL转换逻辑
   */
  private convertToUrl(value: any): string {
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (value === null || value === undefined) {
      return '';
    }
    return JSON.stringify(value);
  }

  /**
   * 默认URL解析逻辑
   */
  private convertFromUrl(urlValue: string, defaultValue: any): any {
    if (typeof defaultValue === 'boolean') {
      return urlValue === '1' || urlValue === 'true';
    }
    if (typeof defaultValue === 'number') {
      const num = Number(urlValue);
      return isNaN(num) ? defaultValue : num;
    }
    if (typeof defaultValue === 'string') {
      return urlValue;
    }
    try {
      return JSON.parse(urlValue);
    } catch {
      return defaultValue;
    }
  }

  /**
   * 重置状态
   */
  reset(): void {
    Object.assign(this.state.value, this.config.defaultState);
    this.updateURL();

    if (this.config.storageKey) {
      localStorage.removeItem(this.config.storageKey);
    }
  }
}

/**
 * 创建状态管理器的工厂函数
 */
export function createURLStateManager<T extends Record<string, any>>(
  config: StateConfig<T>
): URLStateManager<T> {
  return new URLStateManager<T>(config);
}
