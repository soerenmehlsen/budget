# SSR Initial Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the client-side fetch waterfall on first page load by pre-fetching data in async server components and passing it as `initialData` props.

**Architecture:** Each `page.tsx` becomes an async Server Component that checks auth and fetches data via existing services, then passes `userId` and `initialData` to the client component. Each hook accepts an optional `initialData` parameter and skips its fetch `useEffect` when it is present.

**Tech Stack:** Next.js App Router, Supabase SSR (`@supabase/ssr`), TypeScript

---

## File Map

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Async server component — auth check + `fetchDashboardData()` |
| `app/dashboard/dashboard-client.tsx` | Accept `userId` + `initialData` props, remove `useSession` |
| `hooks/useDashboard.ts` | Accept `userId` + `initialData` params, skip fetch when present |
| `app/expenses/page.tsx` | Async server component — auth check + parallel fetch |
| `app/expenses/expenses-client.tsx` | Accept `userId` + `initialData` props, remove `useSession` |
| `hooks/useExpenses.ts` | Accept `initialData` param, skip fetch when present |
| `app/income/page.tsx` | Async server component — auth check + `fetchIncome()` |
| `app/income/income-client.tsx` | Accept `userId` + `initialData` props, remove `useSession` |
| `hooks/useIncome.ts` | Accept `initialData` param, skip fetch when present |
| `app/bank-accounts/page.tsx` | Async server component — auth check + `fetchBankAccounts()` |
| `app/bank-accounts/bank-accounts-client.tsx` | Accept `userId` + `initialData` props, remove `useSession` |
| `hooks/useBankAccounts.ts` | Accept `initialData` param, skip fetch when present |

---

## Task 1: Dashboard — hook, client, page

**Files:**
- Modify: `hooks/useDashboard.ts`
- Modify: `app/dashboard/dashboard-client.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Update `hooks/useDashboard.ts`**

Replace the entire file with:

```ts
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
```

- [ ] **Step 2: Update `app/dashboard/dashboard-client.tsx`**

Change the component signature and remove `useSession`. Replace the top of the file (imports + function signature + hook call):

```tsx
// Remove this import:
// import { useSession } from "@/hooks/useSession";

// Add this import at the top with other imports:
import type { DashboardData } from "@/services/dashboardService.types";
```

Replace the function declaration:
```tsx
// Before:
export function DashboardClient() {
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    isCheckingSession,
    isLoadingDashboard,
    ...
  } = useDashboard(sortMode);

// After:
type Props = {
  userId: string | null;
  initialData: DashboardData | null;
};

export function DashboardClient({ userId, initialData }: Props) {
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    isLoadingDashboard,
    dataSource,
    showWelcome,
    setShowWelcome,
    groupedExpenses,
    transferTargets,
    totalMonthlyIncome,
    totalMonthlyExpenses,
    incomeSourceCount,
    expenseItemCount,
  } = useDashboard(sortMode, userId, initialData);
```

- [ ] **Step 3: Update `app/dashboard/page.tsx`**

Replace the entire file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/services/dashboardService";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <DashboardClient userId={null} initialData={null} />;
  }

  const { data } = await fetchDashboardData();
  return <DashboardClient userId={user.id} initialData={data} />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to dashboard files.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/dashboard-client.tsx hooks/useDashboard.ts
git commit -m "perf: SSR initial data for dashboard"
```

---

## Task 2: Expenses — hook, client, page

**Files:**
- Modify: `hooks/useExpenses.ts`
- Modify: `app/expenses/expenses-client.tsx`
- Modify: `app/expenses/page.tsx`

- [ ] **Step 1: Update `hooks/useExpenses.ts`**

Change the function signature and state initializers. Replace the `useExpenses` function declaration and the two `useState` calls for `expenseItems` and `bankAccounts`:

```ts
// New type at the top of the file, after existing imports:
type InitialData = { expenses: ExpenseItem[]; accounts: BankAccount[] };

// New function signature:
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
```

Replace the cache-read effect (first `useEffect`) to skip when `initialData` is present:

```ts
  useEffect(() => {
    if (initialData || !userId || fetchResult !== null) return;
    const cached = readCachedData<ExpenseItem[]>(CACHE_KEYS.expenses, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpenseItems(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult, initialData]);
```

Replace the fetch effect (second `useEffect`) to skip when `initialData` is present:

```ts
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
```

Add a new effect after the existing cache-write effect to seed the cache from `initialData`:

```ts
  // Write initialData to cache so SPA navigation gets a cache hit
  useEffect(() => {
    if (!userId || !initialData) return;
    writeCachedData(CACHE_KEYS.expenses, userId, initialData.expenses, "supabase");
  }, [userId, initialData]);
```

- [ ] **Step 2: Update `app/expenses/expenses-client.tsx`**

Add a `Props` type and update the component signature. Remove `useSession`:

```tsx
// Remove this import:
// import { useSession } from "@/hooks/useSession";

// ExpenseItem is already imported — extend it to also include BankAccount:
// Before: import type { ExpenseItem } from "@/types/budget";
// After:
import type { BankAccount, ExpenseItem } from "@/types/budget";
```

Replace the function declaration:

```tsx
// Before:
export function ExpensesClient() {
  const { userId, isCheckingSession } = useSession();
  const {
    groupedExpenses,
    ...
  } = useExpenses(userId);

// After:
type Props = {
  userId: string | null;
  initialData: { expenses: ExpenseItem[]; accounts: BankAccount[] } | null;
};

export function ExpensesClient({ userId, initialData }: Props) {
  const {
    groupedExpenses,
    bankAccounts,
    bankAccountLookup,
    dataSource,
    isLoading,
    isLoadingAccounts,
    isSaving,
    error,
    clearError,
    bankAccountError,
    totalMonthly,
    totalCount,
    addExpense,
    updateExpense,
    removeExpense,
  } = useExpenses(userId, initialData);
```

- [ ] **Step 3: Update `app/expenses/page.tsx`**

Replace the entire file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchExpenses } from "@/services/expenseService";
import { fetchBankAccounts } from "@/services/bankAccountService";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ExpensesClient userId={null} initialData={null} />;
  }

  const [expenses, accounts] = await Promise.all([fetchExpenses(), fetchBankAccounts()]);
  return <ExpensesClient userId={user.id} initialData={{ expenses, accounts }} />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to expenses files.

- [ ] **Step 5: Commit**

```bash
git add app/expenses/page.tsx app/expenses/expenses-client.tsx hooks/useExpenses.ts
git commit -m "perf: SSR initial data for expenses"
```

---

## Task 3: Income — hook, client, page

**Files:**
- Modify: `hooks/useIncome.ts`
- Modify: `app/income/income-client.tsx`
- Modify: `app/income/page.tsx`

- [ ] **Step 1: Update `hooks/useIncome.ts`**

Change the function signature and state initializer:

```ts
// New function signature:
export function useIncome(userId: string | null, initialData: IncomeItem[] | null = null) {
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>(() => {
    if (initialData) return initialData;
    if (!userId && isDemoMode()) return FALLBACK_INCOMES;
    return [];
  });
```

Replace the cache-read effect to skip when `initialData` is present:

```ts
  useEffect(() => {
    if (initialData || !userId || fetchResult !== null) return;
    const cached = readCachedData<IncomeItem[]>(CACHE_KEYS.income, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIncomeItems(cached.data);
      setDataSource(cached.source);
    }
  }, [userId, fetchResult, initialData]);
```

Replace the fetch effect to skip when `initialData` is present:

```ts
  useEffect(() => {
    if (initialData) return;
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
  }, [initialData]);
```

Add a new effect to seed the cache from `initialData`:

```ts
  // Write initialData to cache so SPA navigation gets a cache hit
  useEffect(() => {
    if (!userId || !initialData) return;
    writeCachedData(CACHE_KEYS.income, userId, initialData, "supabase");
  }, [userId, initialData]);
```

- [ ] **Step 2: Update `app/income/income-client.tsx`**

Add a `Props` type and update the component signature. Remove `useSession`:

```tsx
// Remove this import:
// import { useSession } from "@/hooks/useSession";

// IncomeItem is already imported — no new imports needed.
```

Replace the function declaration:

```tsx
// Before:
export function IncomeClient() {
  const { userId, isCheckingSession } = useSession();
  const { incomeItems, ... } = useIncome(userId);

// After:
type Props = {
  userId: string | null;
  initialData: IncomeItem[] | null;
};

export function IncomeClient({ userId, initialData }: Props) {
  const { incomeItems, dataSource, isLoading, isSaving, error, clearError, addIncome, updateIncome, removeIncome } = useIncome(userId, initialData);
```

- [ ] **Step 3: Update `app/income/page.tsx`**

Replace the entire file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchIncome } from "@/services/incomeService";
import { IncomeClient } from "./income-client";

export default async function IncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <IncomeClient userId={null} initialData={null} />;
  }

  const income = await fetchIncome();
  return <IncomeClient userId={user.id} initialData={income} />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to income files.

- [ ] **Step 5: Commit**

```bash
git add app/income/page.tsx app/income/income-client.tsx hooks/useIncome.ts
git commit -m "perf: SSR initial data for income"
```

---

## Task 4: Bank Accounts — hook, client, page

**Files:**
- Modify: `hooks/useBankAccounts.ts`
- Modify: `app/bank-accounts/bank-accounts-client.tsx`
- Modify: `app/bank-accounts/page.tsx`

- [ ] **Step 1: Update `hooks/useBankAccounts.ts`**

Change the function signature and state initializer:

```ts
// New function signature:
export function useBankAccounts(userId: string | null, initialData: BankAccount[] | null = null) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (initialData) return initialData;
    if (!userId && isDemoMode()) return FALLBACK_BANK_ACCOUNTS;
    return [];
  });
```

Replace the cache-read effect to skip when `initialData` is present:

```ts
  useEffect(() => {
    if (initialData || !userId || fetchResult !== null) return;
    const cached = readCachedData<BankAccount[]>(CACHE_KEYS.bankAccounts, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBankAccounts(cached.data);
    }
  }, [userId, fetchResult, initialData]);
```

Replace the fetch effect to skip when `initialData` is present:

```ts
  useEffect(() => {
    if (initialData) return;
    if (isDemoMode()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    fetchBankAccounts()
      .then((accounts) => {
        if (!isMounted) return;
        setBankAccounts(accounts);
        setFetchResult(accounts);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Kunne ikke hente bankkonti.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [initialData]);
```

Add a new effect to seed the cache from `initialData`:

```ts
  // Write initialData to cache so SPA navigation gets a cache hit
  useEffect(() => {
    if (!userId || !initialData) return;
    writeCachedData(CACHE_KEYS.bankAccounts, userId, initialData, "supabase");
  }, [userId, initialData]);
```

- [ ] **Step 2: Update `app/bank-accounts/bank-accounts-client.tsx`**

Add a `Props` type and update the component signature. Remove `useSession`:

```tsx
// Remove this import:
// import { useSession } from "@/hooks/useSession";

// BankAccount is already imported — no new imports needed.
```

Replace the function declaration:

```tsx
// Before:
export function BankAccountsClient() {
  const { userId, isCheckingSession } = useSession();
  const {
    bankAccounts,
    ...
  } = useBankAccounts(isCheckingSession ? null : userId);

// After:
type Props = {
  userId: string | null;
  initialData: BankAccount[] | null;
};

export function BankAccountsClient({ userId, initialData }: Props) {
  const {
    bankAccounts,
    isLoading: isLoadingAccounts,
    isSaving: isSavingAccount,
    error: accountError,
    message: accountMessage,
    addBankAccount,
    editBankAccount,
    removeBankAccount,
  } = useBankAccounts(userId, initialData);
```

- [ ] **Step 3: Update `app/bank-accounts/page.tsx`**

Replace the entire file:

```tsx
import { createClient } from "@/lib/supabase/server";
import { fetchBankAccounts } from "@/services/bankAccountService";
import { BankAccountsClient } from "./bank-accounts-client";

export default async function BankAccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <BankAccountsClient userId={null} initialData={null} />;
  }

  const accounts = await fetchBankAccounts();
  return <BankAccountsClient userId={user.id} initialData={accounts} />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to bank-accounts files.

- [ ] **Step 5: Commit**

```bash
git add app/bank-accounts/page.tsx app/bank-accounts/bank-accounts-client.tsx hooks/useBankAccounts.ts
git commit -m "perf: SSR initial data for bank-accounts"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Note: Next.js will report which pages are SSR vs static — dashboard, expenses, income, and bank-accounts should all show as dynamic (SSR).

- [ ] **Step 2: Start dev server and verify authenticated flow**

```bash
npm run dev
```

Open each page in the browser while logged in. In DevTools → Network tab, confirm there are **no** fetch calls to Supabase on initial page load for these four routes. Data should appear immediately without a loading flash.

- [ ] **Step 3: Verify unauthenticated / demo mode still works**

Open a page without being logged in. Confirm the client redirects to `/` (existing `useSession` behavior for non-demo users). Enable demo mode and confirm fallback data renders correctly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "perf: verify SSR initial data across all four routes"
```
