import { supabase } from "@/lib/supabase/client";

export type IncomeItem = {
  id: string;
  name: string;
  amountMonthly: number;
  amountPeriod?: number | null;
  periodLabel?: string | null;
  sortOrder?: number | null;
};

export type IncomeSaveParams = {
  userId: string;
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
  sortOrder: number;
};

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

export async function fetchIncome(userId: string): Promise<IncomeItem[]> {
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
  const { data, error } = await supabase
    .from("income_sources")
    .insert({
      user_id: params.userId,
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

export async function updateIncome(id: string, userId: string, params: IncomeSaveParams): Promise<IncomeItem> {
  const { data, error } = await supabase
    .from("income_sources")
    .update({
      user_id: params.userId,
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

export async function deleteIncome(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("income_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}
