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
import type { IncomeItem } from "@/types/budget";

export type IncomeFormValues = {
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
};

type DataSource = "supabase" | "fallback";

const FALLBACK_INCOMES: IncomeItem[] = [
  { id: "salary-person1", name: "Person 1", amountMonthly: 28000, sortOrder: 1 },
  { id: "salary-person2", name: "Person 2", amountMonthly: 22000, sortOrder: 2 },
  { id: "bonus", name: "Bonus", amountMonthly: 5000, sortOrder: 3 },
];

function bySortOrderAndName(
  a: { sortOrder?: number | null; name: string },
  b: { sortOrder?: number | null; name: string },
) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "da-DK");
}

export function useIncome(userId: string | null) {
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>("fallback");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadData = async () => {
      const cached = readCachedData<IncomeItem[]>(CACHE_KEYS.income, userId);
      if (cached) {
        setIncomeItems(cached.data);
        setDataSource(cached.source);
      }

      setIsLoading(true);

      try {
        const items = await fetchIncome(userId);

        if (!isMounted) return;

        if (items.length === 0) {
          setIncomeItems(FALLBACK_INCOMES);
          setDataSource("fallback");
          writeCachedData(CACHE_KEYS.income, userId, FALLBACK_INCOMES, "fallback");
        } else {
          const sorted = [...items].sort(bySortOrderAndName);
          setIncomeItems(sorted);
          setDataSource("supabase");
          writeCachedData(CACHE_KEYS.income, userId, sorted, "supabase");
        }
      } catch {
        if (!isMounted) return;
        setIncomeItems(FALLBACK_INCOMES);
        setDataSource("fallback");
      }

      setIsLoading(false);
    };

    void loadData();

    return () => { isMounted = false; };
  }, [userId]);

  const addIncome = async (values: IncomeFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder = incomeItems.length + 1;
    setIsSaving(true);
    try {
      const saved = await createIncome({ ...values, userId, sortOrder });
      const next = [...incomeItems, saved].sort(bySortOrderAndName);
      setIncomeItems(next);
      writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } finally {
      setIsSaving(false);
    }
  };

  const updateIncome = async (id: string, values: IncomeFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder = incomeItems.find((item) => item.id === id)?.sortOrder ?? incomeItems.length;
    setIsSaving(true);
    try {
      const saved = await updateIncomeInDb(id, userId, { ...values, userId, sortOrder });
      const next = incomeItems.map((item) => (item.id === id ? saved : item)).sort(bySortOrderAndName);
      setIncomeItems(next);
      writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } finally {
      setIsSaving(false);
    }
  };

  const removeIncome = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    await deleteIncomeInDb(id, userId);
    const next = incomeItems.filter((item) => item.id !== id);
    setIncomeItems(next);
    writeCachedData(CACHE_KEYS.income, userId, next, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");
  };

  return {
    incomeItems,
    dataSource,
    isLoading,
    isSaving,
    addIncome,
    updateIncome,
    removeIncome,
  };
}
