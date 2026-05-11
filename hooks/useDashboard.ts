"use client";

import { useEffect, useMemo, useState } from "react";
import { isDemoMode } from "@/lib/demo-mode";
import { CACHE_KEYS, readCachedData, writeCachedData } from "@/lib/data-cache";
import { fetchDashboardData } from "@/services/dashboardService";
import { FALLBACK_DASHBOARD_DATA, type DashboardData } from "@/services/dashboardService.types";
import type { ExpenseItem } from "@/types/budget";

type FetchResult = { data: DashboardData; source: "supabase" | "fallback" };
type DataSource = "supabase" | "fallback";

export type TransferTarget = {
  id: string;
  name: string;
  amountMonthly: number;
};

export type GroupedExpense = {
  category: string;
  items: ExpenseItem[];
  totalMonthly: number;
};

type SortMode = "alpha" | "highest";

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "da-DK");
}

export function useDashboard(sortMode: SortMode, userId: string | null, initialData: DashboardData | null) {
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() => {
    if (initialData) return initialData;
    if (isDemoMode()) return FALLBACK_DASHBOARD_DATA;
    return null;
  });
  const [dataSource, setDataSource] = useState<DataSource>(() =>
    initialData ? "supabase" : "fallback",
  );
  const [showWelcome, setShowWelcome] = useState(() => {
    if (!initialData) return false;
    return initialData.incomeSources.length === 0 && initialData.expenseItems.length === 0;
  });
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);

  // Show cached data instantly while fetch is in progress (only when no initialData)
  useEffect(() => {
    if (initialData || !userId || fetchResult !== null) return;
    const cached = readCachedData<DashboardData>(CACHE_KEYS.dashboard, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDashboardData(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult, initialData]);

  // Fire immediately — skip if initialData was provided by server
  useEffect(() => {
    if (initialData) return;
    if (isDemoMode()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingDashboard(true);

    fetchDashboardData()
      .then(({ data, source }) => {
        if (!isMounted) return;
        setDashboardData(data);
        setDataSource(source);
        setFetchResult({ data, source });
        const hasData = data.incomeSources.length > 0 || data.expenseItems.length > 0;
        if (!hasData) setShowWelcome(true);
      })
      .catch(() => {
        // Not authenticated — client handles redirect
      })
      .finally(() => {
        if (isMounted) setIsLoadingDashboard(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialData]);

  // Write cache when fresh data arrives via client fetch
  useEffect(() => {
    if (!userId || fetchResult === null) return;
    writeCachedData(CACHE_KEYS.dashboard, userId, fetchResult.data, fetchResult.source);
  }, [userId, fetchResult]);

  // Write initialData to cache so SPA navigation gets a cache hit
  useEffect(() => {
    if (!userId || !initialData) return;
    writeCachedData(CACHE_KEYS.dashboard, userId, initialData, "supabase");
  }, [userId, initialData]);

  const groupedExpenses = useMemo((): GroupedExpense[] => {
    const grouped = new Map<string, ExpenseItem[]>();

    for (const item of dashboardData?.expenseItems ?? []) {
      const bucket = grouped.get(item.category) ?? [];
      bucket.push(item);
      grouped.set(item.category, bucket);
    }

    return Array.from(grouped.entries())
      .map(([category, items]) => ({
        category,
        items: [...items].sort(bySortOrderAndName),
        totalMonthly: items.reduce((total, item) => total + item.amountMonthly, 0),
      }))
      .sort((a, b) => {
        if (sortMode === "highest") return b.totalMonthly - a.totalMonthly;
        return a.category.localeCompare(b.category, "da-DK");
      });
  }, [dashboardData?.expenseItems, sortMode]);

  const transferTargets = useMemo((): TransferTarget[] => {
    const expenses = dashboardData?.expenseItems ?? [];
    const accounts = dashboardData?.bankAccounts ?? [];
    const totals = new Map<string, number>();

    for (const item of expenses) {
      if (!item.bankAccountId) continue;
      totals.set(item.bankAccountId, (totals.get(item.bankAccountId) ?? 0) + item.amountMonthly);
    }

    return accounts
      .map((account) => ({
        id: account.id,
        name: account.name,
        amountMonthly: totals.get(account.id) ?? 0,
      }))
      .filter((account) => account.amountMonthly > 0);
  }, [dashboardData?.bankAccounts, dashboardData?.expenseItems]);

  const totalMonthlyIncome = useMemo(
    () => (dashboardData?.incomeSources ?? []).reduce((sum, s) => sum + s.amountMonthly, 0),
    [dashboardData?.incomeSources],
  );

  const totalMonthlyExpenses = useMemo(
    () => groupedExpenses.reduce((sum, group) => sum + group.totalMonthly, 0),
    [groupedExpenses],
  );

  return {
    isLoadingDashboard,
    dataSource,
    showWelcome,
    setShowWelcome,
    groupedExpenses,
    transferTargets,
    totalMonthlyIncome,
    totalMonthlyExpenses,
    profileName: dashboardData?.profileName ?? null,
    incomeSourceCount: dashboardData?.incomeSources.length ?? 0,
    expenseItemCount: dashboardData?.expenseItems.length ?? 0,
  };
}
