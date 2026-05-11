# SSR Initial Data — Design Spec

**Date:** 2026-05-11
**Approach:** A — `initialData` props
**Scope:** `/dashboard`, `/expenses`, `/income`, `/bank-accounts`

---

## Goal

Eliminate the client-side fetch waterfall on first page load. Currently all four pages render a blank/loading state until JavaScript loads and fires `useEffect`. With this change, data arrives pre-populated in the server-rendered HTML.

---

## Architecture

Each page follows the same pattern:

```
page.tsx  (async Server Component)
  ├─ createClient() → auth check → redirect("/") if not authenticated
  ├─ isDemoMode() check → pass fallback data directly if active
  ├─ Fetch data via existing services (already "use server")
  └─ Render <*Client initialData={...} />

*Client.tsx  (Client Component)
  ├─ Receives initialData as prop
  ├─ Passes to hook as initialData parameter
  ├─ No useSession, no isLoading on first render
  └─ Mutations unchanged (server actions)
```

---

## Props From Server

Each `page.tsx` passes two props to the client component:

- `initialData` — pre-fetched data (avoids client-side fetch on first load)
- `userId` — from `user.id` after server auth check (replaces `useSession` for cache writes and mutation guards)

```tsx
return <ExpensesClient initialData={...} userId={user.id} />;
```

Hooks receive `userId` as a parameter (unchanged) — the only change is the source: server prop instead of `useSession`.

---

## Changes Per Page

### `/dashboard`
- `page.tsx`: call `fetchDashboardData()`, pass `{ incomeSources, expenseItems, bankAccounts, profileName }` as `initialData` to `DashboardClient`
- `DashboardClient`: accept `initialData` prop, pass to `useDashboard`
- `useDashboard`: accept `initialData`, initialize state from it, skip fetch `useEffect` when present

### `/expenses`
- `page.tsx`: call `fetchExpenses()` and `fetchBankAccounts()` in parallel via `Promise.all`, pass as `initialData` to `ExpensesClient`
- `ExpensesClient`: accept `initialData`, pass to `useExpenses`
- `useExpenses`: accept `initialData: { expenses, accounts }`, initialize state from it, skip fetch `useEffect` when present

### `/income`
- `page.tsx`: call `fetchIncome()`, pass as `initialData` to `IncomeClient`
- `IncomeClient`: accept `initialData`, pass to `useIncome`
- `useIncome`: accept `initialData`, initialize state from it, skip fetch `useEffect` when present

### `/bank-accounts`
- `page.tsx`: call `fetchBankAccounts()`, pass as `initialData` to `BankAccountsClient`
- `BankAccountsClient`: accept `initialData`, pass to `useBankAccounts`
- `useBankAccounts`: accept `initialData`, initialize state from it, skip fetch `useEffect` when present

---

## Hook Changes

Each hook receives an optional `initialData` parameter:

```ts
export function useExpenses(userId: string | null, initialData?: InitialData) {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(
    () => initialData?.expenses ?? []
  );

  useEffect(() => {
    if (initialData) return; // skip on SSR-seeded load
    // existing fetch logic (used on client-side navigation)
  }, []);
}
```

**Removed from hooks:**
- `useSession` calls (auth is now server-side)
- `isCheckingSession` state
- Initial loading state on first render

**Preserved:**
- All mutation functions (`add*`, `update*`, `remove*`)
- localStorage cache (written after mount, used on SPA navigation)
- Demo mode fallback logic

---

## Error Handling

| Scenario | Handling |
|---|---|
| Not authenticated | `redirect("/")` in `page.tsx` |
| Supabase fetch error in `page.tsx` | Error thrown → caught by route `error.tsx` |
| Demo mode | `isDemoMode()` in `page.tsx` → fallback data passed as `initialData`, Supabase skipped |
| Client-side navigation | Hook fetches normally using localStorage cache |

---

## `useDashboard` — Special Case

`showWelcome` logic (show welcome modal if no data exists) is checked against `initialData` instead of the fetch result:

```ts
const hasData = (initialData?.incomeSources.length ?? 0) > 0
             || (initialData?.expenseItems.length ?? 0) > 0;
if (!hasData) setShowWelcome(true);
```

---

## What Does Not Change

- Server actions for mutations (`createExpense`, `updateExpense`, etc.)
- `loading.tsx` per route (still shown during navigation)
- `error.tsx` per route
- Component structure and Tailwind styling
- `useSession` in `login-panel` and other auth-related components
- Demo mode data and fallback constants
- localStorage cache TTL and invalidation logic
