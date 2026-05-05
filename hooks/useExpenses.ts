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
import { isDemoMode } from "@/lib/demo-mode";
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
    if (!userId) {
      if (isDemoMode()) {
        setExpenseItems(FALLBACK_EXPENSES);
        setBankAccounts(FALLBACK_BANK_ACCOUNTS);
        setDataSource("fallback");
      }
      return;
    }

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
          if (isDemoMode()) {
            setExpenseItems(FALLBACK_EXPENSES);
            setDataSource("fallback");
            writeCachedData(CACHE_KEYS.expenses, userId, FALLBACK_EXPENSES, "fallback");
          } else {
            setExpenseItems([]);
            setDataSource("supabase");
            writeCachedData(CACHE_KEYS.expenses, userId, [], "supabase");
          }
        } else {
          const sorted = [...items].sort(bySortOrderAndName);
          setExpenseItems(sorted);
          setDataSource("supabase");
          writeCachedData(CACHE_KEYS.expenses, userId, sorted, "supabase");
        }
      } else {
        if (isDemoMode()) {
          setExpenseItems(FALLBACK_EXPENSES);
          setDataSource("fallback");
        }
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
