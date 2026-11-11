export const PACEMAN_RANGES = {
  session: { hours: 24, hoursBetween: 2, ttl: 60 },
  day: { hours: 24, hoursBetween: 24, ttl: 120 },
  week: { hours: 168, hoursBetween: 168, ttl: 300 },
  month: { hours: 720, hoursBetween: 720, ttl: 600 },
} as const;

export type PacemanRange = keyof typeof PACEMAN_RANGES;
export type StatsProvider = 'paceman' | 'ranked';
export type StatsStatus = 'ok' | 'not_found' | 'unbound' | 'unavailable';
export type StatsError = 'timeout' | 'rate_limited' | 'upstream' | 'invalid_response';

export const MAX_STALE_MS = 24 * 60 * 60 * 1000;
export const RANKED_TTL = 180;

export interface PaceItem {
  count: number;
  avg: string;
}

export const PACE_SPLITS = [
  'nether',
  'first_structure',
  'second_structure',
  'first_portal',
  'stronghold',
  'end',
  'finish',
] as const;
export type PacemanStats = Record<(typeof PACE_SPLITS)[number], PaceItem>;

const RANKED_FIELDS = [
  'bestTime',
  'playedMatches',
  'completionTime',
  'forfeits',
  'completions',
  'wins',
  'loses',
] as const;
export type RankedStats = Record<(typeof RANKED_FIELDS)[number], { ranked: number }>;
export interface RankedUserData {
  eloRate: number | null;
  eloRank: number | null;
  statistics: { season: RankedStats; total: RankedStats };
}

export interface ProviderData {
  paceman: PacemanStats;
  ranked: RankedUserData;
}

export interface StatsResult<T> {
  status: StatsStatus;
  data: T | null;
  updatedAt: string | null;
  expiresAt: string | null;
  stale: boolean;
  error?: StatsError;
  retryAfter?: number;
}

export interface StatsQuery<P extends StatsProvider = StatsProvider> {
  provider: P;
  profileId: string | number;
  // Only used to invalidate the browser cache when the profile binding changes.
  ingamename?: string | null;
  range?: PacemanRange;
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

// Keep only public fields the cards consume; malformed upstream data must not replace good data.
export function normalizePaceman(value: unknown): PacemanStats | null {
  if (!record(value)) return null;
  const output = {} as PacemanStats;
  for (const split of PACE_SPLITS) {
    const item = value[split];
    if (!record(item) || !nonnegative(item.count) || !Number.isInteger(item.count)) return null;
    if (item.avg !== null && typeof item.avg !== 'string') return null;
    output[split] = { count: item.count, avg: item.avg || '--:--' };
  }
  return output;
}

export function normalizeRanked(value: unknown): RankedUserData | null {
  if (!record(value) || !record(value.statistics)) return null;
  if (value.eloRate !== null && !nonnegative(value.eloRate)) return null;
  if (value.eloRank !== null && !nonnegative(value.eloRank)) return null;
  const statistics = {} as RankedUserData['statistics'];
  for (const period of ['season', 'total'] as const) {
    const source = value.statistics[period];
    if (!record(source)) return null;
    const output = {} as RankedStats;
    for (const field of RANKED_FIELDS) {
      const item = source[field];
      if (!record(item) || !nonnegative(item.ranked)) return null;
      output[field] = { ranked: item.ranked };
    }
    statistics[period] = output;
  }
  return {
    eloRate: value.eloRate as number | null,
    eloRank: value.eloRank as number | null,
    statistics,
  };
}

export function normalizeStats<P extends StatsProvider>(
  provider: P,
  value: unknown
): ProviderData[P] | null {
  return (provider === 'paceman' ? normalizePaceman(value) : normalizeRanked(value)) as
    | ProviderData[P]
    | null;
}

export function emptyResult<T>(
  status: Exclude<StatsStatus, 'ok'>,
  error?: StatsError
): StatsResult<T> {
  return {
    status,
    data: null,
    updatedAt: null,
    expiresAt: null,
    stale: false,
    ...(error ? { error } : {}),
  };
}
