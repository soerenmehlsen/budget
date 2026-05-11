"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/hooks/useSession";
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

export function useDashboard(sortMode: SortMode) {
  const { userId, isCheckingSession } = useSession();

  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() =>
    isDemoMode() ? FALLBACK_DASHBOARD_DATA : null,
  );
  const [dataSource, setDataSource] = useState<DataSource>("fallback");
  const [showWelcome, setShowWelcome] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);

  // Show cached data instantly while fetch is in progress
  useEffect(() => {
    if (!userId || fetchResult !== null) return;
    const cached = readCachedData<DashboardData>(CACHE_KEYS.dashboard, userId);
    if (cached) {
      setDashboardData(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult]);

  // Fire immediately — server action validates auth via session cookie
  useEffect(() => {
    if (isDemoMode()) return;

    let isMounted = true;
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
        // Not authenticated — useSession handles redirect
      })
      .finally(() => {
        if (isMounted) setIsLoadingDashboard(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Write cache once userId is known and fresh data is available
  useEffect(() => {
    if (!userId || fetchResult === null) return;
    writeCachedData(CACHE_KEYS.dashboard, userId, fetchResult.data, fetchResult.source);
  }, [userId, fetchResult]);

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

  const totalMonthlyIncome = (dashboardData?.incomeSources ?? []).reduce(
    (sum, source) => sum + source.amountMonthly,
    0,
  );

  const totalMonthlyExpenses = groupedExpenses.reduce(
    (sum, group) => sum + group.totalMonthly,
    0,
  );

  return {
    isCheckingSession,
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
