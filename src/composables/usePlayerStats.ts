import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { playerStatsClient } from '@/services/playerStats';
import {
  emptyResult,
  MAX_STALE_MS,
  type ProviderData,
  type StatsProvider,
  type StatsQuery,
  type StatsResult,
} from '../../shared/player-stats.ts';

export function usePlayerStats<P extends StatsProvider>(query: () => StatsQuery<P>) {
  const result = shallowRef<StatsResult<ProviderData[P]> | null>(null);
  const isLoading = ref(false);
  let generation = 0;
  let disposed = false;
  let refreshChecks = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  async function load(force = false, reset = false, followup = false) {
    clearTimeout(refreshTimer);
    if (!followup) refreshChecks = 0;
    const current = query();
    const version = ++generation;
    if (reset) result.value = playerStatsClient.cached(current);
    if (
      result.value?.data &&
      Date.now() - Date.parse(result.value.updatedAt ?? '') >= MAX_STALE_MS
    ) {
      result.value = emptyResult('unavailable', 'upstream');
    }
    if (!current.profileId) {
      result.value = emptyResult('unbound');
      isLoading.value = false;
      return;
    }
    isLoading.value = true;
    try {
      const next = await playerStatsClient.load(current, force);
      if (!disposed && version === generation) {
        result.value = next;
        // Read back the completed background refresh without leaving the card
        // stuck on its initial stale snapshot. Never poll through an error.
        if (next.data && next.stale && !next.error && refreshChecks < 2) {
          refreshChecks++;
          refreshTimer = setTimeout(() => {
            if (document.visibilityState === 'visible') void load(true, false, true);
          }, 6000);
        }
      }
    } finally {
      if (!disposed && version === generation) isLoading.value = false;
    }
  }

  watch(result, (value) => {
    clearTimeout(expiryTimer);
    if (!value?.data || !value.updatedAt) return;
    expiryTimer = setTimeout(
      () => {
        result.value = emptyResult('unavailable', 'upstream');
      },
      Math.max(0, Date.parse(value.updatedAt) + MAX_STALE_MS - Date.now())
    );
  });

  watch(
    () => {
      const current = query();
      return [current.profileId, current.ingamename, current.range];
    },
    () => {
      void load(false, true);
    },
    { immediate: true }
  );

  const onReturn = () => {
    if (document.visibilityState === 'visible' && !isLoading.value) void load();
  };
  window.addEventListener('focus', onReturn);
  window.addEventListener('online', onReturn);
  onScopeDispose(() => {
    disposed = true;
    generation++;
    clearTimeout(refreshTimer);
    clearTimeout(expiryTimer);
    window.removeEventListener('focus', onReturn);
    window.removeEventListener('online', onReturn);
  });

  return {
    result,
    data: computed(() => result.value?.data ?? null),
    isLoading,
    retry: () => load(true),
  };
}
