import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '@/lib/supabaseClient';
import { showErrorNotification } from '@/utils/notification';

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
  is_new_record: boolean;
}

export const LEADERBOARD_CACHE_TTL = 60_000;

interface LoadOptions {
  force?: boolean;
  silent?: boolean;
}

export const useStatsStore = defineStore('stats', () => {
  const cache = ref(new Map<string, Run[]>());
  const cacheUpdatedAt = new Map<string, number>();
  const inFlight = new Map<string, Promise<{ data: Run[]; updatedAt: number }>>();
  const currStats = ref<Run[]>([]);
  const leaderboardLoading = ref(false);
  const pendingLoading = ref(false);
  const isLoading = computed(() => leaderboardLoading.value || pendingLoading.value);
  const lastUpdatedAt = ref<number | null>(null);
  const loadError = ref<string | null>(null);
  const pages = ref(0);
  let requestSequence = 0;

  const getPendingRuns = async () => {
    if (pendingLoading.value) return;
    pendingLoading.value = true;
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
      pendingLoading.value = false;
    }
  };

  const getLeaderboard = async ({ version = '1.16.1', type = 'RSG', status = 'verified' } = {}) => {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_version: version,
      p_type: type,
      p_status: status,
    });
    if (error) throw error;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return (data ?? []).map((item: Run, index: number) => ({
      ...item,
      rank: index + 1,
      is_new_record: new Date(item.date) > thirtyDaysAgo,
    })) as Run[];
  };

  // Statistics charts also use this method and expect an array on failure.
  const fetchStats = async (version: string, type: string, status: string) => {
    try {
      const data = await getLeaderboard({ version, type, status });
      pages.value = Math.ceil(data.length / 10);
      return data;
    } catch (error) {
      console.error('get_leaderboard error', error);
      showErrorNotification('获取排行榜失败');
      pages.value = 0;
      return [];
    }
  };

  const getStats = async (
    version: string,
    type: string,
    status = 'verified',
    { force = false, silent = false }: LoadOptions = {}
  ) => {
    const key = `${version}|${type}|${status}`;
    const sequence = ++requestSequence;
    const cached = cache.value.get(key);
    const cachedAt = cacheUpdatedAt.get(key) ?? null;

    currStats.value = cached ?? [];
    lastUpdatedAt.value = cachedAt;
    loadError.value = null;
    pages.value = Math.ceil(currStats.value.length / 10);

    if (!force && cached && cachedAt !== null && Date.now() - cachedAt < LEADERBOARD_CACHE_TTL) {
      leaderboardLoading.value = false;
      return;
    }

    leaderboardLoading.value = true;
    try {
      let request = inFlight.get(key);
      if (!request) {
        request = getLeaderboard({ version, type, status })
          .then((data) => {
            const updatedAt = Date.now();
            cache.value.set(key, data);
            cacheUpdatedAt.set(key, updatedAt);
            return { data, updatedAt };
          })
          .finally(() => inFlight.delete(key));
        inFlight.set(key, request);
      }

      const { data, updatedAt } = await request;
      // A response for a previously selected category must not replace the current one.
      if (sequence !== requestSequence) return;
      currStats.value = data;
      lastUpdatedAt.value = updatedAt;
      pages.value = Math.ceil(data.length / 10);
    } catch (error) {
      if (sequence !== requestSequence) return;
      console.error('get_leaderboard error', error);
      loadError.value = cached
        ? '刷新失败，正在显示上次成功加载的榜单。'
        : '暂时无法加载榜单，请刷新重试。';
      if (!silent) showErrorNotification('获取排行榜失败，请稍后重试');
    } finally {
      if (sequence === requestSequence) leaderboardLoading.value = false;
    }
  };

  const refreshStats = (version: string, type: string, status = 'verified') =>
    getStats(version, type, status, { force: true });

  // 清除特定缓存
  const clearCache = (version?: string, type?: string) => {
    if (version && type) {
      for (const key of cache.value.keys()) {
        if (key.startsWith(`${version}|${type}|`)) {
          cache.value.delete(key);
          cacheUpdatedAt.delete(key);
        }
      }
    } else {
      cache.value.clear();
      cacheUpdatedAt.clear();
    }
  };

  return {
    cache,
    currStats,
    isLoading,
    lastUpdatedAt,
    loadError,
    pages,
    fetchStats,
    getStats,
    getPendingRuns,
    refreshStats,
    clearCache,
  };
});
