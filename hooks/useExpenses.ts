"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense as deleteExpenseInDb,
  fetchExpenses,
  updateExpense as updateExpenseInDb,
} from "@/services/expenseService";
import { fetchBankAccounts } from "@/services/bankAccountService";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import { isDemoMode } from "@/lib/demo-mode";
import { bySortOrderAndName } from "@/lib/utils";
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

type InitialData = { expenses: ExpenseItem[]; accounts: BankAccount[] };

const DEMO_BUDGETKONTO_ID = "demo-budgetkonto";
const DEMO_OPSPARINGSKONTO_ID = "demo-opsparingskonto";

const FALLBACK_BANK_ACCOUNTS: BankAccount[] = [
  { id: DEMO_BUDGETKONTO_ID, name: "Budgetkonto", sortOrder: 1 },
  { id: DEMO_OPSPARINGSKONTO_ID, name: "Opsparingskonto", sortOrder: 2 },
];

const FALLBACK_EXPENSES: ExpenseItem[] = [
  { id: "house-rent", category: "Bolig", name: "Husleje", amountMonthly: 12000, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "utility-heat", category: "Forbrug", name: "Varme", amountMonthly: 400, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "utility-electricity", category: "Forbrug", name: "El", amountMonthly: 600, sortOrder: 2, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "utility-water", category: "Forbrug", name: "Vand", amountMonthly: 800, amountPeriod: 2400, periodLabel: "kvartal", sortOrder: 3, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "utility-internet", category: "Forbrug", name: "Internet", amountMonthly: 299, sortOrder: 4, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "transport-car-loan", category: "Transport", name: "Billån", amountMonthly: 2500, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "transport-fuel", category: "Transport", name: "Benzin", amountMonthly: 1000, sortOrder: 2, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "transport-insurance", category: "Transport", name: "Forsikring", amountMonthly: 500, sortOrder: 3, bankAccountId: DEMO_BUDGETKONTO_ID },
  { id: "savings", category: "Opsparing", name: "Opsparing", amountMonthly: 5000, sortOrder: 1, bankAccountId: DEMO_OPSPARINGSKONTO_ID },
];

export function useExpenses(userId: string | null, initialData: InitialData | null = null) {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(() => {
    if (initialData) return initialData.expenses;
    if (!userId && isDemoMode()) return FALLBACK_EXPENSES;
    return [];
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (initialData) return initialData.accounts;
    if (!userId && isDemoMode()) return FALLBACK_BANK_ACCOUNTS;
    return [];
  });
  const [dataSource, setDataSource] = useState<DataSource>(() =>
    initialData ? "supabase" : "fallback",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [fetchResult, setFetchResult] = useState<{ items: ExpenseItem[]; source: DataSource } | null>(null);

  // Show cached data instantly while fetch is in progress
  useEffect(() => {
    if (initialData || !userId || fetchResult !== null) return;
    const cached = readCachedData<ExpenseItem[]>(CACHE_KEYS.expenses, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpenseItems(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult, initialData]);

  // Fire immediately — server action validates auth via session cookie
  useEffect(() => {
    if (initialData) return;
    if (isDemoMode()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setIsLoadingAccounts(true);
    setBankAccountError(null);

    Promise.allSettled([fetchExpenses(), fetchBankAccounts()]).then(
      ([expensesResult, accountsResult]) => {
        if (!isMounted) return;

        if (expensesResult.status === "fulfilled") {
          const sorted = [...expensesResult.value].sort(bySortOrderAndName);
          setExpenseItems(sorted);
          setDataSource("supabase");
          setFetchResult({ items: sorted, source: "supabase" });
        } else {
          setError("Kunne ikke hente udgifter.");
        }

        if (accountsResult.status === "fulfilled") {
          setBankAccounts(accountsResult.value);
        } else {
          setBankAccountError("Kunne ikke hente bankkonti. Tjek at tabellen bank_accounts findes.");
          setBankAccounts([]);
        }

        setIsLoading(false);
        setIsLoadingAccounts(false);
      }
    );

    return () => { isMounted = false; };
  }, [initialData]);

  // Write cache once userId is known and fresh data is available
  useEffect(() => {
    if (!userId || fetchResult === null) return;
    writeCachedData(CACHE_KEYS.expenses, userId, fetchResult.items, fetchResult.source);
  }, [userId, fetchResult]);

  // Write initialData to cache so SPA navigation gets a cache hit
  useEffect(() => {
    if (!userId || !initialData) return;
    writeCachedData(CACHE_KEYS.expenses, userId, initialData.expenses, "supabase");
  }, [userId, initialData]);

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
    setError(null);
    try {
      const saved = await createExpense({ ...values, sortOrder });
      const next = [...expenseItems, saved].sort(bySortOrderAndName);
      setExpenseItems(next);
      writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke gemme udgiften. Prøv igen.");
      throw new Error("Kunne ikke gemme udgiften.");
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
    setError(null);
    try {
      const saved = await updateExpenseInDb(id, { ...values, sortOrder });
      const next = expenseItems.map((item) => (item.id === id ? saved : item)).sort(bySortOrderAndName);
      setExpenseItems(next);
      writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke opdatere udgiften. Prøv igen.");
      throw new Error("Kunne ikke opdatere udgiften.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeExpense = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    setError(null);
    try {
      await deleteExpenseInDb(id);
      const next = expenseItems.filter((item) => item.id !== id);
      setExpenseItems(next);
      writeCachedData(CACHE_KEYS.expenses, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setDataSource("supabase");
    } catch {
      setError("Kunne ikke slette udgiften. Prøv igen.");
      throw new Error("Kunne ikke slette udgiften.");
    }
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
    error,
    clearError: () => setError(null),
    bankAccountError,
    totalMonthly,
    totalCount: expenseItems.length,
    addExpense,
    updateExpense,
    removeExpense,
  };
}
