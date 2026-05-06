"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExpenseItem } from "@/types/budget";
import type { ExpenseSaveParams } from "./expenseService.types";

const EXPENSE_FIELDS = "id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id";

function mapRowToExpenseItem(
  row: {
    id: string;
    category: string;
    name: string;
    amount_monthly: number;
    amount_annual: number | null;
    sort_order: number | null;
    bank_account_id: string | null;
  },
  fallback?: Pick<ExpenseSaveParams, "amountPeriod" | "periodLabel" | "bankAccountId">,
): ExpenseItem {
  return {
    id: row.id ?? `${row.category}-${row.name}`,
    category: row.category,
    name: row.name,
    amountMonthly: row.amount_monthly,
    amountPeriod: typeof row.amount_annual === "number" ? row.amount_annual : (fallback?.amountPeriod ?? null),
    periodLabel: typeof row.amount_annual === "number" ? (fallback?.periodLabel ?? "år") : null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
    bankAccountId: typeof row.bank_account_id === "string" ? row.bank_account_id : (fallback?.bankAccountId ?? null),
  };
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");
  return { supabase, userId: user.id };
}

export async function fetchExpenses(): Promise<ExpenseItem[]> {
  const { supabase, userId } = await requireUserId();

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
}

export async function createExpense(params: ExpenseSaveParams): Promise<ExpenseItem> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("expense_items")
    .insert({
      user_id: userId,
      category: params.category,
      name: params.name,
      amount_monthly: params.amountMonthly,
      amount_annual: params.amountPeriod,
      sort_order: params.sortOrder,
      bank_account_id: params.bankAccountId,
    })
    .select(EXPENSE_FIELDS)
    .single();

  if (error) throw error;

  return mapRowToExpenseItem(data, params);
}

export async function updateExpense(id: string, params: ExpenseSaveParams): Promise<ExpenseItem> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("expense_items")
    .update({
      category: params.category,
      name: params.name,
      amount_monthly: params.amountMonthly,
      amount_annual: params.amountPeriod,
      sort_order: params.sortOrder,
      bank_account_id: params.bankAccountId,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(EXPENSE_FIELDS)
    .single();

  if (error) throw error;

  return mapRowToExpenseItem(data, params);
}

export async function deleteExpense(id: string): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase
    .from("expense_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
