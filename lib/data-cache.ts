type DataSource = "supabase" | "fallback";

type CacheEnvelope<T> = {
  data: T;
  source: DataSource;
};

const CACHE_PREFIX = "budget-cache";
const CACHE_VERSION = "v1";

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
    return JSON.parse(cached) as CacheEnvelope<T>;
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

  const envelope: CacheEnvelope<T> = { data, source };
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
