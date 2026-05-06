"use server";

import { createClient } from "@/lib/supabase/server";
import type { IncomeItem } from "@/types/budget";
import type { IncomeSaveParams } from "./incomeService.types";

const INCOME_FIELDS = "id, name, amount_monthly, amount_period, period_label, sort_order";

function mapRowToIncomeItem(
  row: {
    id: string;
    name: string;
    amount_monthly: number;
    amount_period: number | null;
    period_label: string | null;
    sort_order: number | null;
  },
  fallback?: Pick<IncomeSaveParams, "amountPeriod" | "periodLabel">,
): IncomeItem {
  return {
    id: row.id ?? `income-${row.name}`,
    name: row.name,
    amountMonthly: row.amount_monthly,
    amountPeriod: typeof row.amount_period === "number" ? row.amount_period : (fallback?.amountPeriod ?? null),
    periodLabel: typeof row.period_label === "string" ? row.period_label : (fallback?.periodLabel ?? null),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
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

export async function fetchIncome(): Promise<IncomeItem[]> {
  const { supabase, userId } = await requireUserId();

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
}

export async function createIncome(params: IncomeSaveParams): Promise<IncomeItem> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("income_sources")
    .insert({
      user_id: userId,
      name: params.name,
      amount_monthly: params.amountMonthly,
      amount_period: params.amountPeriod,
      period_label: params.amountPeriod === null ? null : params.periodLabel,
      sort_order: params.sortOrder,
    })
    .select(INCOME_FIELDS)
    .single();

  if (error) throw error;

  return mapRowToIncomeItem(data, params);
}

export async function updateIncome(id: string, params: IncomeSaveParams): Promise<IncomeItem> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("income_sources")
    .update({
      name: params.name,
      amount_monthly: params.amountMonthly,
      amount_period: params.amountPeriod,
      period_label: params.amountPeriod === null ? null : params.periodLabel,
      sort_order: params.sortOrder,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select(INCOME_FIELDS)
    .single();

  if (error) throw error;

  return mapRowToIncomeItem(data, params);
}

export async function deleteIncome(id: string): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase
    .from("income_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
