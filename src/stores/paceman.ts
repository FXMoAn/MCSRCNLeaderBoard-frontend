import axios from 'axios';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { showErrorNotification } from '@/utils/notification';

let request = axios.create({
  baseURL: 'https://mcsrcors.fxmoan148.workers.dev/?url=https://paceman.gg/stats/api/',
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

export const usePacemanStore = defineStore('paceman', () => {
  const cache = ref<PacemanStatsCache[]>([]);

  const clearCache = (key: string) => {
    cache.value = cache.value.filter((item) => item.key !== key);
  };

  const fetchPacemanStats = async (
    ingamename: string,
    hours: number,
    hoursBetween: number
  ): Promise<PacemanStats | null> => {
    let key = `${ingamename}${hours}${hoursBetween}`;

    const target = cache.value.find((item) => item.key === key);

    if (target) {
      if (target.expiresAt < Date.now()) {
        clearCache(key);
      } else {
        return target.value;
      }
    }

    try {
      let response = await request({
        method: 'GET',
        url: `getSessionStats?name=${ingamename}&hours=${hours}&hoursBetween=${hoursBetween}`,
      });
      cache.value.push({
        key,
        value: response.data,
        expiresAt: Date.now() + 1 * 60 * 1000,
      });
      return response.data;
    } catch (err) {
      showErrorNotification('获取Paceman数据失败');
      return null;
    }
  };

  return {
    cache,
    clearCache,
    fetchPacemanStats,
  };
});
