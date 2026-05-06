import type { BankAccount, ExpenseItem } from "@/types/budget";

export type { BankAccount, ExpenseItem };

export type ExpenseSaveParams = {
  category: string;
  name: string;
  amountMonthly: number;
  amountPeriod: number | null;
  periodLabel: string | null;
  sortOrder: number;
  bankAccountId: string | null;
};
