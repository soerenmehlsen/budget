"use server";

import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";
import type { ExpenseItem } from "@/types/budget";
import { FALLBACK_DASHBOARD_DATA, type DashboardData } from "./dashboardService.types";

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "da-DK");
}

export async function fetchDashboardData(): Promise<{
  data: DashboardData;
  source: "supabase" | "fallback";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");

  const [profileResult, incomeResult, expenseResult, bankAccountResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("income_sources")
      .select("name, amount_monthly")
      .order("name", { ascending: true }),
    supabase
      .from("expense_items")
      .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
      .order("sort_order", { ascending: true }),
    supabase
      .from("bank_accounts")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const profileName = profileResult.error ? null : (profileResult.data?.display_name ?? null);

  const incomeSources =
    incomeResult.error || !incomeResult.data || incomeResult.data.length === 0
      ? isDemoMode() ? FALLBACK_DASHBOARD_DATA.incomeSources : []
      : incomeResult.data
          .filter((row) => typeof row.amount_monthly === "number")
          .map((row) => ({
            name: row.name || "Indkomst",
            amountMonthly: row.amount_monthly,
          }));

  const expenseItems =
    expenseResult.error || !expenseResult.data || expenseResult.data.length === 0
      ? isDemoMode() ? FALLBACK_DASHBOARD_DATA.expenseItems : []
      : expenseResult.data
          .filter(
            (row) =>
              typeof row.amount_monthly === "number" &&
              typeof row.category === "string" &&
              typeof row.name === "string",
          )
          .map((row): ExpenseItem => ({
            id: row.id ?? `${row.category}-${row.name}`,
            category: row.category,
            name: row.name,
            amountMonthly: row.amount_monthly,
            amountPeriod: typeof row.amount_annual === "number" ? row.amount_annual : null,
            sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
            bankAccountId: typeof row.bank_account_id === "string" ? row.bank_account_id : null,
          }))
          .sort(bySortOrderAndName);

  const bankAccounts =
    bankAccountResult.error || !bankAccountResult.data
      ? []
      : bankAccountResult.data
          .filter((row) => typeof row.id === "string" && typeof row.name === "string")
          .map((row) => ({
            id: row.id,
            name: row.name,
            sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
          }))
          .sort((a, b) => {
            const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name, "da-DK");
          });

  const hasSupabaseData =
    !incomeResult.error &&
    !expenseResult.error &&
    incomeResult.data !== null &&
    expenseResult.data !== null &&
    (incomeResult.data.length > 0 || expenseResult.data.length > 0);

  return {
    data: { profileName, incomeSources, expenseItems, bankAccounts },
    source: hasSupabaseData ? "supabase" : isDemoMode() ? "fallback" : "supabase",
  };
}
