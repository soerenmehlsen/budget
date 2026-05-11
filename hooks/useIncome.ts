"use client";

import { useEffect, useState } from "react";
import {
  createIncome,
  deleteIncome as deleteIncomeInDb,
  fetchIncome,
  updateIncome as updateIncomeInDb,
} from "@/services/incomeService";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import { isDemoMode } from "@/lib/demo-mode";
import { bySortOrderAndName } from "@/lib/utils";
import type { IncomeItem } from "@/types/budget";

export type IncomeFormValues = {
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
};

type DataSource = "supabase" | "fallback";

const FALLBACK_INCOMES: IncomeItem[] = [
  { id: "loen", name: "Løn", amountMonthly: 28000, sortOrder: 1 },
  { id: "bonus", name: "Bonus", amountMonthly: 5000, amountPeriod: 15000, periodLabel: "kvartal", sortOrder: 2 },
];

export function useIncome(userId: string | null) {
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(() =>
    !userId && isDemoMode() ? FALLBACK_INCOMES : []
  );
  const [dataSource, setDataSource] = useState<DataSource>("fallback");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchResult, setFetchResult] = useState<{ items: IncomeItem[]; source: DataSource } | null>(null);

  // Show cached data instantly while fetch is in progress
  useEffect(() => {
    if (!userId || fetchResult !== null) return;
    const cached = readCachedData<IncomeItem[]>(CACHE_KEYS.income, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIncomeItems(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult]);

  // Fire immediately — server action validates auth via session cookie
  useEffect(() => {
    if (isDemoMode()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    fetchIncome()
      .then((items) => {
        if (!isMounted) return;
        const sorted = [...items].sort(bySortOrderAndName);
        setIncomeItems(sorted);
        setDataSource("supabase");
        setFetchResult({ items: sorted, source: "supabase" });
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Kunne ikke hente indkomster.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Write cache once userId is known and fresh data is available
  useEffect(() => {
    if (!userId || fetchResult === null) return;
    writeCachedData(CACHE_KEYS.income, userId, fetchResult.items, fetchResult.source);
  }, [userId, fetchResult]);

  const addIncome = async (values: IncomeFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder = incomeItems.length + 1;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await createIncome({ ...values, sortOrder });
      const next = [...incomeItems, saved].sort(bySortOrderAndName);
      setIncomeItems(next);
      writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke gemme indkomsten. Prøv igen.");
      throw new Error("Kunne ikke gemme indkomsten.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateIncome = async (id: string, values: IncomeFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder = incomeItems.find((item) => item.id === id)?.sortOrder ?? incomeItems.length;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await updateIncomeInDb(id, { ...values, sortOrder });
      const next = incomeItems.map((item) => (item.id === id ? saved : item)).sort(bySortOrderAndName);
      setIncomeItems(next);
      writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke opdatere indkomsten. Prøv igen.");
      throw new Error("Kunne ikke opdatere indkomsten.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeIncome = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    setError(null);
    try {
      await deleteIncomeInDb(id);
      const next = incomeItems.filter((item) => item.id !== id);
      setIncomeItems(next);
      writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke slette indkomsten. Prøv igen.");
      throw new Error("Kunne ikke slette indkomsten.");
    }
  };

  return {
    incomeItems,
    dataSource,
    isLoading,
    isSaving,
    error,
    clearError: () => setError(null),
    addIncome,
    updateIncome,
    removeIncome,
  };
}
