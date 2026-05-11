# SSR Performance: Auth Deduplication + Data Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicate `supabase.auth.getUser()` calls per page render (2–3 auth round trips → 1) and add a short-lived server-side data cache so repeated page loads don't always hit Supabase.

**Architecture:**
- **Task 1** wraps auth in React's `cache()` so all code within a single SSR render shares one auth result. No new dependencies.
- **Task 2** introduces a Supabase admin client (service role) and `unstable_cache` to cache fetch results server-side for 60 seconds per user, with tag-based invalidation on every mutation.

**Tech Stack:** Next.js App Router, React `cache()`, `next/cache` (`unstable_cache`, `revalidateTag`), `@supabase/supabase-js` service role client.

---

## Files Modified / Created

| File | Change |
|---|---|
| `lib/supabase/server.ts` | Export `getUser` cached helper |
| `lib/supabase/admin.ts` | **New** — service role client for `unstable_cache` callbacks |
| `services/expenseService.ts` | Use `getUser()`, wrap `fetchExpenses` in `unstable_cache`, call `revalidateTag` on mutations |
| `services/incomeService.ts` | Same pattern |
| `services/bankAccountService.ts` | Same pattern |
| `services/dashboardService.ts` | Use `getUser()`, wrap fetch in `unstable_cache` |
| `app/dashboard/page.tsx` | Use `getUser()` |
| `app/expenses/page.tsx` | Use `getUser()` |
| `app/income/page.tsx` | Use `getUser()` |
| `app/bank-accounts/page.tsx` | Use `getUser()` |
| `.env.local` | Add `SUPABASE_SERVICE_ROLE_KEY` (manual step) |

---

## Task 1: Auth Deduplication with React `cache()`

React's `cache()` memoises a function's result **per request render**. Every call to `getUser()` within one SSR render returns the same Promise — only the first call hits Supabase.

**Files:**
- Modify: `lib/supabase/server.ts`
- Modify: `services/expenseService.ts`
- Modify: `services/incomeService.ts`
- Modify: `services/bankAccountService.ts`
- Modify: `services/dashboardService.ts`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/expenses/page.tsx`
- Modify: `app/income/page.tsx`
- Modify: `app/bank-accounts/page.tsx`

- [ ] **Step 1: Add `getUser` cached helper to `lib/supabase/server.ts`**

Replace the entire file content with:

```ts
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware refreshes the session.
        }
      },
    },
  });
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
```

- [ ] **Step 2: Update `requireUserId` in `services/expenseService.ts`**

Find this block (lines ~35–42):
```ts
async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");
  return { supabase, userId: user.id };
}
```

Replace with:
```ts
async function requireUserId() {
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");
  const supabase = await createClient();
  return { supabase, userId: user.id };
}
```

Also add the import at the top of the file (after the existing imports):
```ts
import { createClient, getUser } from "@/lib/supabase/server";
```

> The existing import is `import { createClient } from "@/lib/supabase/server";` — extend it to also import `getUser`.

- [ ] **Step 3: Same change in `services/incomeService.ts`**

Add `getUser` to the import:
```ts
import { createClient, getUser } from "@/lib/supabase/server";
```

Replace `requireUserId`:
```ts
async function requireUserId() {
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");
  const supabase = await createClient();
  return { supabase, userId: user.id };
}
```

- [ ] **Step 4: Same change in `services/bankAccountService.ts`**

Add `getUser` to the import:
```ts
import { createClient, getUser } from "@/lib/supabase/server";
```

Replace `requireUserId`:
```ts
async function requireUserId() {
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");
  const supabase = await createClient();
  return { supabase, userId: user.id };
}
```

- [ ] **Step 5: Update `services/dashboardService.ts`**

Add `getUser` to the import:
```ts
import { createClient, getUser } from "@/lib/supabase/server";
```

Find the auth block inside `fetchDashboardData` (lines ~12–15):
```ts
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");
```

Replace with:
```ts
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");
  const supabase = await createClient();
```

- [ ] **Step 6: Update all four `page.tsx` files to use `getUser()`**

In `app/dashboard/page.tsx`, replace:
```ts
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
```
with:
```ts
  const user = await getUser();
```

And change the import from:
```ts
import { createClient } from "@/lib/supabase/server";
```
to:
```ts
import { getUser } from "@/lib/supabase/server";
```

Repeat the same substitution for:
- `app/expenses/page.tsx`
- `app/income/page.tsx`
- `app/bank-accounts/page.tsx`

Each of those pages has the same two-line auth block and the same `createClient` import. Replace all four.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/sorenmehlsen/Code/budget && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/supabase/server.ts services/expenseService.ts services/incomeService.ts services/bankAccountService.ts services/dashboardService.ts app/dashboard/page.tsx app/expenses/page.tsx app/income/page.tsx app/bank-accounts/page.tsx
git commit -m "perf: deduplicate auth calls with React cache()

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Server-Side Data Cache with `unstable_cache`

`unstable_cache` stores the return value of an async function in Next.js's server-side Data Cache. The result lives for 60 seconds (configurable). When a mutation happens, `revalidateTag()` clears only that user's data.

Because `unstable_cache` callbacks run outside the request context (no cookies), we use a Supabase **service role** client that authenticates via the secret key instead of session cookies. The queries still filter by `user_id`, so data isolation is preserved.

**Prerequisite:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. Get it from the Supabase dashboard → Project Settings → API → `service_role` key.

**Files:**
- Create: `lib/supabase/admin.ts`
- Modify: `services/expenseService.ts`
- Modify: `services/incomeService.ts`
- Modify: `services/bankAccountService.ts`
- Modify: `services/dashboardService.ts`

- [ ] **Step 1: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`**

Open `.env.local` and add:
```
SUPABASE_SERVICE_ROLE_KEY=<your service role key from Supabase dashboard>
```

This key is **server-only** — never use it in client-side code or `NEXT_PUBLIC_` variables.

- [ ] **Step 2: Create `lib/supabase/admin.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 3: Add cache tags constant file**

Create `lib/cache-tags.ts`:
```ts
export const cacheTags = {
  expenses: (userId: string) => `expenses-${userId}`,
  income: (userId: string) => `income-${userId}`,
  bankAccounts: (userId: string) => `bank-accounts-${userId}`,
  dashboard: (userId: string) => `dashboard-${userId}`,
};
```

- [ ] **Step 4: Wrap `fetchExpenses` in `unstable_cache` in `services/expenseService.ts`**

Add these imports at the top:
```ts
import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheTags } from "@/lib/cache-tags";
```

Replace the `fetchExpenses` function with:
```ts
export async function fetchExpenses(): Promise<ExpenseItem[]> {
  const { userId } = await requireUserId();
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("expense_items")
        .select(EXPENSE_FIELDS)
        .eq("user_id", userId)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter(
          (row) =>
            typeof row.amount_monthly === "number" &&
            typeof row.category === "string" &&
            typeof row.name === "string",
        )
        .map((row) => mapRowToExpenseItem(row));
    },
    [cacheTags.expenses(userId)],
    { revalidate: 60, tags: [cacheTags.expenses(userId)] },
  )();
}
```

Add `revalidateTag` calls to mutations. In `createExpense`, add after `if (error) throw error;` at the end of the try block:
```ts
  revalidateTag(cacheTags.expenses(userId));
  revalidateTag(cacheTags.dashboard(userId));
```

Same two lines in `updateExpense` and `deleteExpense` (after success, before return/end of function).

- [ ] **Step 5: Same pattern in `services/incomeService.ts`**

Add imports:
```ts
import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheTags } from "@/lib/cache-tags";
```

Replace `fetchIncome`:
```ts
export async function fetchIncome(): Promise<IncomeItem[]> {
  const { userId } = await requireUserId();
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("income_sources")
        .select(INCOME_FIELDS)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter(
          (row) =>
            typeof row.amount_monthly === "number" &&
            typeof row.name === "string",
        )
        .map((row) => mapRowToIncomeItem(row));
    },
    [cacheTags.income(userId)],
    { revalidate: 60, tags: [cacheTags.income(userId)] },
  )();
}
```

Add to `createIncome`, `updateIncome`, `deleteIncome` (after success):
```ts
  revalidateTag(cacheTags.income(userId));
  revalidateTag(cacheTags.dashboard(userId));
```

- [ ] **Step 6: Same pattern in `services/bankAccountService.ts`**

Add imports:
```ts
import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheTags } from "@/lib/cache-tags";
```

Replace `fetchBankAccounts`:
```ts
export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { userId } = await requireUserId();
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select(BANK_ACCOUNT_FIELDS)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => typeof row.id === "string" && typeof row.name === "string")
        .map(mapRow)
        .sort(bySortOrderAndName);
    },
    [cacheTags.bankAccounts(userId)],
    { revalidate: 60, tags: [cacheTags.bankAccounts(userId)] },
  )();
}
```

Add to `createBankAccount`, `updateBankAccount`, `deleteBankAccount` (after success):
```ts
  revalidateTag(cacheTags.bankAccounts(userId));
  revalidateTag(cacheTags.dashboard(userId));
```

- [ ] **Step 7: Wrap `fetchDashboardData` in `unstable_cache` in `services/dashboardService.ts`**

Add imports:
```ts
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheTags } from "@/lib/cache-tags";
```

After `const user = await getUser(); if (!user) throw ...`, extract the fetch logic into a cached call:

```ts
export async function fetchDashboardData(): Promise<{
  data: DashboardData;
  source: "supabase" | "fallback";
}> {
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");

  return unstable_cache(
    async () => {
      const supabase = createAdminClient();

      const [profileResult, incomeResult, expenseResult, bankAccountResult] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("income_sources")
          .select("name, amount_monthly")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
        supabase
          .from("expense_items")
          .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("bank_accounts")
          .select("id, name, sort_order")
          .eq("user_id", user.id)
          .order("sort_order", { ascending: true }),
      ]);

      // ... keep the existing mapping logic unchanged (profileName, incomeSources, expenseItems, bankAccounts, hasSupabaseData)
      // Copy the full mapping block from the current implementation here.
    },
    [cacheTags.dashboard(user.id)],
    { revalidate: 60, tags: [cacheTags.dashboard(user.id)] },
  )();
}
```

> Keep the entire data-mapping block (profileName, incomeSources, expenseItems, bankAccounts, return statement) inside the cache callback — just move it there unchanged.

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /Users/sorenmehlsen/Code/budget && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Smoke-test the app**

```bash
cd /Users/sorenmehlsen/Code/budget && npm run dev
```

1. Navigate to `/dashboard` — data loads correctly.
2. Add a new expense — navigate back to `/dashboard` — updated data appears (cache was invalidated).
3. Navigate between pages — data stays consistent.

- [ ] **Step 10: Commit**

```bash
git add lib/supabase/admin.ts lib/cache-tags.ts services/expenseService.ts services/incomeService.ts services/bankAccountService.ts services/dashboardService.ts
git commit -m "perf: add unstable_cache for SSR data fetches with tag invalidation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
