import type { IncomeItem } from "@/types/budget";

export type { IncomeItem };

export type IncomeSaveParams = {
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
  sortOrder: number;
};
