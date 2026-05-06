import { supabase } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";
import type { BankAccount, ExpenseItem } from "@/types/budget";

export type IncomeSource = {
  name: string;
  amountMonthly: number;
};

export type DashboardData = {
  profileName?: string | null;
  incomeSources: IncomeSource[];
  expenseItems: ExpenseItem[];
  bankAccounts: BankAccount[];
};

const DEMO_BUDGETKONTO_ID = "demo-budgetkonto";
const DEMO_OPSPARINGSKONTO_ID = "demo-opsparingskonto";

export const FALLBACK_DASHBOARD_DATA: DashboardData = {
  incomeSources: [
    { name: "Løn", amountMonthly: 28000 },
    { name: "Bonus", amountMonthly: 5000 },
  ],
  expenseItems: [
    { id: "house-rent", category: "Bolig", name: "Husleje", amountMonthly: 12000, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "utility-heat", category: "Forbrug", name: "Varme", amountMonthly: 400, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "utility-electricity", category: "Forbrug", name: "El", amountMonthly: 600, sortOrder: 2, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "utility-water", category: "Forbrug", name: "Vand", amountMonthly: 800, amountPeriod: 2400, sortOrder: 3, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "utility-internet", category: "Forbrug", name: "Internet", amountMonthly: 299, sortOrder: 4, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "transport-car-loan", category: "Transport", name: "Billån", amountMonthly: 2500, sortOrder: 1, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "transport-fuel", category: "Transport", name: "Benzin", amountMonthly: 1000, sortOrder: 2, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "transport-insurance", category: "Transport", name: "Forsikring", amountMonthly: 500, sortOrder: 3, bankAccountId: DEMO_BUDGETKONTO_ID },
    { id: "savings", category: "Opsparing", name: "Opsparing", amountMonthly: 5000, sortOrder: 1, bankAccountId: DEMO_OPSPARINGSKONTO_ID },
  ],
  bankAccounts: [
    { id: DEMO_BUDGETKONTO_ID, name: "Budgetkonto", sortOrder: 1 },
    { id: DEMO_OPSPARINGSKONTO_ID, name: "Opsparingskonto", sortOrder: 2 },
  ],
};

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "da-DK");
}

export async function fetchDashboardData(userId: string): Promise<{
  data: DashboardData;
  source: "supabase" | "fallback";
}> {
  const [profileResult, incomeResult, expenseResult, bankAccountResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("income_sources")
      .select("name, amount_monthly")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("expense_items")
      .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("bank_accounts")
      .select("id, name, sort_order")
      .eq("user_id", userId)
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
