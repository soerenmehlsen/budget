"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense as deleteExpenseInDb,
  fetchBankAccounts,
  fetchExpenses,
  updateExpense as updateExpenseInDb,
} from "@/services/expenseService";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import type { BankAccount, ExpenseItem } from "@/types/budget";

export type ExpenseFormValues = {
  category: string;
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
  bankAccountId: string | null;
};

export type GroupedExpense = {
  category: string;
  items: ExpenseItem[];
  totalMonthly: number;
};

type DataSource = "supabase" | "fallback";

const FALLBACK_EXPENSES: ExpenseItem[] = [
  { id: "house-rent", category: "Bolig", name: "Husleje/boliglån", amountMonthly: 12000, sortOrder: 1 },
  { id: "house-tax", category: "Bolig", name: "Ejendomsskat", amountMonthly: 1500, amountPeriod: 18000, periodLabel: "år", sortOrder: 2 },
  { id: "utility-heat", category: "Forbrug", name: "Varme", amountMonthly: 800, sortOrder: 1 },
  { id: "utility-electricity", category: "Forbrug", name: "El", amountMonthly: 600, sortOrder: 2 },
  { id: "utility-water", category: "Forbrug", name: "Vand", amountMonthly: 800, amountPeriod: 2400, periodLabel: "kvartal", sortOrder: 3 },
  { id: "utility-internet", category: "Forbrug", name: "Internet", amountMonthly: 299, sortOrder: 4 },
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

export function useExpenses(userId: string | null) {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>("fallback");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadData = async () => {
      const cached = readCachedData<ExpenseItem[]>(CACHE_KEYS.expenses, userId);
      if (cached) {
        setExpenseItems(cached.data);
        setDataSource(cached.source);
      }

      setIsLoading(true);
      setIsLoadingAccounts(true);
      setBankAccountError(null);

      const [expensesResult, accountsResult] = await Promise.allSettled([
        fetchExpenses(userId),
        fetchBankAccounts(userId),
      ]);

      if (!isMounted) return;

      if (expensesResult.status === "fulfilled") {
        const items = expensesResult.value;
        if (items.length === 0) {
          setExpenseItems(FALLBACK_EXPENSES);
          setDataSource("fallback");
          writeCachedData(CACHE_KEYS.expenses, userId, FALLBACK_EXPENSES, "fallback");
        } else {
          const sorted = [...items].sort(bySortOrderAndName);
          setExpenseItems(sorted);
          setDataSource("supabase");
          writeCachedData(CACHE_KEYS.expenses, userId, sorted, "supabase");
        }
      } else {
        setExpenseItems(FALLBACK_EXPENSES);
        setDataSource("fallback");
      }

      if (accountsResult.status === "fulfilled") {
        setBankAccounts(accountsResult.value);
      } else {
        setBankAccountError("Kunne ikke hente bankkonti. Tjek at tabellen bank_accounts findes.");
        setBankAccounts([]);
      }

      setIsLoading(false);
      setIsLoadingAccounts(false);
    };

    void loadData();

    return () => { isMounted = false; };
  }, [userId]);

  const groupedExpenses = useMemo<GroupedExpense[]>(() => {
    const grouped = new Map<string, ExpenseItem[]>();
    for (const item of expenseItems) {
      const bucket = grouped.get(item.category) ?? [];
      bucket.push(item);
      grouped.set(item.category, bucket);
    }
    return Array.from(grouped.entries())
      .map(([groupCategory, items]) => ({
        category: groupCategory,
        items: [...items].sort(bySortOrderAndName),
        totalMonthly: items.reduce((sum, item) => sum + item.amountMonthly, 0),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "da-DK"));
  }, [expenseItems]);

  const totalMonthly = useMemo(
    () => groupedExpenses.reduce((sum, group) => sum + group.totalMonthly, 0),
    [groupedExpenses],
  );

  const bankAccountLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const account of bankAccounts) lookup.set(account.id, account.name);
    return lookup;
  }, [bankAccounts]);

  const addExpense = async (values: ExpenseFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder = expenseItems.filter((item) => item.category === values.category).length + 1;
    setIsSaving(true);
    try {
      const saved = await createExpense({ ...values, userId, sortOrder });
      const next = [...expenseItems, saved].sort(bySortOrderAndName);
      setExpenseItems(next);
      writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } finally {
      setIsSaving(false);
    }
  };

  const updateExpense = async (id: string, values: ExpenseFormValues): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    const sortOrder =
      expenseItems.find((item) => item.id === id)?.sortOrder ??
      expenseItems.filter((item) => item.category === values.category && item.id !== id).length + 1;
    setIsSaving(true);
    try {
      const saved = await updateExpenseInDb(id, userId, { ...values, userId, sortOrder });
      const next = expenseItems.map((item) => (item.id === id ? saved : item)).sort(bySortOrderAndName);
      setExpenseItems(next);
      writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } finally {
      setIsSaving(false);
    }
  };

  const removeExpense = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    await deleteExpenseInDb(id, userId);
    const next = expenseItems.filter((item) => item.id !== id);
    setExpenseItems(next);
    writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");
  };

  return {
    expenseItems,
    groupedExpenses,
    bankAccounts,
    bankAccountLookup,
    dataSource,
    isLoading,
    isLoadingAccounts,
    isSaving,
    bankAccountError,
    totalMonthly,
    totalCount: expenseItems.length,
    addExpense,
    updateExpense,
    removeExpense,
  };
}
