import { ref, computed } from "vue";
import { defineStore } from "pinia";
import request from "@/utils/request";
import type UserInfo from "@/types/LeaderBoardTypes";
import { supabase } from "@/lib/supabaseClient";

interface Run {
  id: number;
  userid: string;
  nickname: string;
  igt: string;
  date: string;
  version: string;
  type: string;
  videolink: string;
  remarks: string;
  seed: string;
}

export const useStatsStore = defineStore("stats", () => {
  const cache = ref(new Map());
  const currStats = ref<Run[]>([]);
  const isLoading = ref(false);
  const pages = ref(0);

  const getLeaderboard = async ({ version = "1.16.1", type = "RSG" } = {}) => {
    try {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_version: version,
        p_type: type,
      });

      if (error) {
        console.error("get_leaderboard error", error);
        return [];
      }
      return data;
    } catch (err) {
      console.error("get_leaderboard error", err);
      return [];
    }
  };

  const fetchStats = async (version: string, type: string) => {
    const data = await getLeaderboard({ version, type });
    pages.value = Math.ceil(data.length / 10);
    return data;
  };

  const getStats = async (version: string, type: string) => {
    let key = `${version}${type}`;
    if (isLoading.value) return;
    isLoading.value = true;

    try {
      if (cache.value.has(key)) {
        currStats.value = cache.value.get(key);
      }
      const data = await fetchStats(version, type);
      cache.value.set(key, data);
      currStats.value = data;
    } catch (err) {
      console.log(err);
    } finally {
      isLoading.value = false;
    }
  };
  return {
    cache,
    currStats,
    isLoading,
    pages,
    fetchStats,
    getStats,
  };
});
