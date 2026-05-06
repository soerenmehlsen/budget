type DataSource = "supabase" | "fallback";

type CacheEnvelope<T> = {
  data: T;
  source: DataSource;
  writtenAt: number;
};

const CACHE_PREFIX = "budget-cache";
const CACHE_VERSION = "v2";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export const CACHE_KEYS = {
  dashboard: "dashboard",
  expenses: "expenses",
  income: "income",
  bankAccounts: "bank-accounts",
} as const;

function getCacheKey(key: string, userId: string) {
  return `${CACHE_PREFIX}:${CACHE_VERSION}:${userId}:${key}`;
}

export function readCachedData<T>(key: string, userId: string): CacheEnvelope<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = localStorage.getItem(getCacheKey(key, userId));

  if (!cached) {
    return null;
  }

  try {
    const envelope = JSON.parse(cached) as CacheEnvelope<T>;
    if (Date.now() - envelope.writtenAt > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(getCacheKey(key, userId));
      return null;
    }
    return envelope;
  } catch {
    localStorage.removeItem(getCacheKey(key, userId));
    return null;
  }
}

export function writeCachedData<T>(
  key: string,
  userId: string,
  data: T,
  source: DataSource,
) {
  if (typeof window === "undefined") {
    return;
  }

  const envelope: CacheEnvelope<T> = { data, source, writtenAt: Date.now() };
  localStorage.setItem(getCacheKey(key, userId), JSON.stringify(envelope));
}

export function removeCachedData(key: string, userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(getCacheKey(key, userId));
}

export function invalidateDashboardCache(userId: string) {
  removeCachedData(CACHE_KEYS.dashboard, userId);
}
