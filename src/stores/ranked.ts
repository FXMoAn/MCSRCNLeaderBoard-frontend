import axios from 'axios';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { showErrorNotification } from '@/utils/notification';

let request = axios.create({
  baseURL: 'https://api.mcsrranked.com/',
  timeout: 5000,
});

interface RankedStatsCache {
  key: string;
  value: RankedUserData;
  expiresAt: number;
}

interface StatsType {
  ranked: number;
  casual: number;
}

interface RankedStats {
  bestTime: StatsType;
  highestWinStreak: StatsType;
  currentWinStreak: StatsType;
  playedMatches: StatsType;
  playtime: StatsType;
  completionTime: StatsType;
  forfeits: StatsType;
  completions: StatsType;
  wins: StatsType;
  loses: StatsType;
}

export interface RankedUserData {
  eloRate: number;
  eloRank: number;
  statistics: {
    season: RankedStats;
    total: RankedStats;
  };
  seasonResult: {
    last: {
      eloRate: number;
      eloRank: number;
    };
    highest: number;
    lowest: number;
  };
}

// 本地存储缓存管理
const CACHE_PREFIX = 'ranked_cache_';
const CACHE_EXPIRY_KEY = 'ranked_cache_expiry';

const getCacheFromStorage = (): RankedStatsCache[] => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

const saveCacheToStorage = (cache: RankedStatsCache[]) => {
  try {
    localStorage.setItem(CACHE_PREFIX, JSON.stringify(cache));
  } catch (error) {
    console.warn('保存缓存到本地存储失败:', error);
  }
};

const clearExpiredCache = (): RankedStatsCache[] => {
  const now = Date.now();
  const cache = getCacheFromStorage();
  const validCache = cache.filter((item) => item.expiresAt > now);

  if (validCache.length !== cache.length) {
    saveCacheToStorage(validCache);
  }

  return validCache;
};

export const useRankedStore = defineStore('ranked', () => {
  const clearCache = (key: string) => {
    const cache = getCacheFromStorage();
    const filteredCache = cache.filter((item) => item.key !== key);
    saveCacheToStorage(filteredCache);
  };

  const fetchRankedStats = async (ingamename: string): Promise<RankedUserData | null> => {
    let key = `${ingamename}`;

    // 先清理过期的缓存
    const cache = clearExpiredCache();
    const target = cache.find((item) => item.key === key);

    if (target) {
      return target.value;
    }

    try {
      let response = await request({
        method: 'GET',
        url: `users/${ingamename}`,
      });

      const newCacheItem = {
        key,
        value: response.data.data,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      cache.push(newCacheItem);
      saveCacheToStorage(cache);

      return response.data;
    } catch (error) {
      console.error('获取排名数据失败:', error);
      return null;
    }
  };

  return {
    clearCache,
    fetchRankedStats,
  };
});
