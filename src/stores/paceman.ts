import axios from 'axios';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { showErrorNotification } from '@/utils/notification';

let request = axios.create({
  baseURL: 'https://mcsrcors.fxmoan148.workers.dev',
  timeout: 5000,
});

interface PaceItem {
  count: number;
  avg: string;
}

export interface PacemanStats {
  nether: PaceItem;
  first_structure: PaceItem;
  second_structure: PaceItem;
  first_portal: PaceItem;
  stronghold: PaceItem;
  end: PaceItem;
  finish: PaceItem;
}

interface PacemanStatsCache {
  key: string;
  value: PacemanStats;
  expiresAt: number;
}

// 本地存储缓存管理
const CACHE_PREFIX = 'paceman_cache_';
const CACHE_EXPIRY_KEY = 'paceman_cache_expiry';

const getCacheFromStorage = (): PacemanStatsCache[] => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const saveCacheToStorage = (cache: PacemanStatsCache[]) => {
  try {
    localStorage.setItem(CACHE_PREFIX, JSON.stringify(cache));
  } catch (error) {
    console.warn('保存缓存到本地存储失败:', error);
  }
};

const clearExpiredCache = (): PacemanStatsCache[] => {
  const now = Date.now();
  const cache = getCacheFromStorage();
  const validCache = cache.filter((item) => item.expiresAt > now);

  if (validCache.length !== cache.length) {
    saveCacheToStorage(validCache);
  }

  return validCache;
};

export const usePacemanStore = defineStore('paceman', () => {
  const clearCache = (key: string) => {
    const cache = getCacheFromStorage();
    const filteredCache = cache.filter((item) => item.key !== key);
    saveCacheToStorage(filteredCache);
  };

  const fetchPacemanStats = async (
    ingamename: string,
    hours: number,
    hoursBetween: number
  ): Promise<PacemanStats | null> => {
    let key = `${ingamename}${hours}${hoursBetween}`;

    // 先清理过期的缓存
    const cache = clearExpiredCache();
    const target = cache.find((item) => item.key === key);

    if (target) {
      return target.value;
    }

    try {
      // 构建完整的API URL并进行编码
      const apiUrl = `https://paceman.gg/stats/api/getSessionStats?name=${encodeURIComponent(ingamename)}&hours=${encodeURIComponent(hours)}&hoursBetween=${encodeURIComponent(hoursBetween)}`;

      let response = await request({
        method: 'GET',
        url: `?url=${encodeURIComponent(apiUrl)}`,
      });

      // 将新数据添加到缓存并保存到本地存储
      const newCacheItem = {
        key,
        value: response.data,
        expiresAt: Date.now() + 1 * 60 * 1000,
      };
      cache.push(newCacheItem);
      saveCacheToStorage(cache);

      return response.data;
    } catch (err) {
      showErrorNotification('获取Paceman数据失败');
      return null;
    }
  };

  return {
    clearCache,
    fetchPacemanStats,
  };
});
