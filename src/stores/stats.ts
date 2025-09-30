import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '@/lib/supabaseClient';
import {
  showErrorNotification,
  showSuccessNotification,
  showInfoNotification,
} from '@/utils/notification';

export interface Run {
  run_id: number;
  userid: string;
  nickname: string;
  igt: string;
  date: string;
  version: string;
  type: string;
  videolink: string;
  remarks: string;
  seed: string;
  rank: number;
}

export const useStatsStore = defineStore('stats', () => {
  const cache = ref(new Map());
  const currStats = ref<Run[]>([]);
  const isLoading = ref(false);
  const pages = ref(0);

  const getPendingRuns = async () => {
    if (isLoading.value) return;
    isLoading.value = true;
    try {
      const { data, error } = await supabase.rpc('get_runs_by_status', {
        p_status: 'pending',
      });
      if (error) {
        console.error('get_runs_by_status error', error);
        showErrorNotification('获取待审核成绩失败');
        return [];
      }
      return data;
    } catch (error) {
      console.error('get_runs_by_status error', error);
      showErrorNotification('获取待审核成绩失败');
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  const getLeaderboard = async ({ version = '1.16.1', type = 'RSG', status = 'verified' } = {}) => {
    try {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_version: version,
        p_type: type,
        p_status: status,
      });

      if (error) {
        console.error('get_leaderboard error', error);
        showErrorNotification('获取排行榜失败');
        return [];
      }
      data.map((item: Run, index: number) => {
        item.rank = index + 1;
        return item;
      });
      return data;
    } catch (err) {
      console.error('get_leaderboard error', err);
      showErrorNotification('获取排行榜失败');
      return [];
    }
  };

  const fetchStats = async (version: string, type: string, status: string) => {
    const data = await getLeaderboard({ version, type, status });
    pages.value = Math.ceil(data.length / 10);
    return data;
  };

  const getStats = async (version: string, type: string, status: string = 'verified') => {
    let key = `${version}${type}${status}`;
    if (isLoading.value) return;

    // 如果缓存存在，直接使用缓存数据
    if (cache.value.has(key)) {
      currStats.value = cache.value.get(key);
      pages.value = Math.ceil(currStats.value.length / 10);
      return; // 直接返回，不重新请求
    }

    isLoading.value = true;

    try {
      const data = await fetchStats(version, type, status);
      cache.value.set(key, data);
      currStats.value = data;
    } catch (err) {
      console.log(err);
      showErrorNotification('获取排行榜失败');
    } finally {
      isLoading.value = false;
    }
  };

  // 强制刷新数据，忽略缓存
  const refreshStats = async (version: string, type: string) => {
    let key = `${version}${type}`;
    if (isLoading.value) return;

    isLoading.value = true;

    try {
      const data = await fetchStats(version, type, status);
      cache.value.set(key, data);
      currStats.value = data;
    } catch (err) {
      console.log(err);
      showErrorNotification('获取排行榜失败');
    } finally {
      isLoading.value = false;
    }
  };

  // 清除特定缓存
  const clearCache = (version?: string, type?: string) => {
    if (version && type) {
      const key = `${version}${type}`;
      cache.value.delete(key);
    } else {
      // 清除所有缓存
      cache.value.clear();
    }
  };

  return {
    cache,
    currStats,
    isLoading,
    pages,
    fetchStats,
    getStats,
    getPendingRuns,
    refreshStats,
    clearCache,
  };
});
