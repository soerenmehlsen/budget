export type Frequency = "monthly" | "quarterly" | "halfYearly" | "yearly";

export type BankAccount = {
  id: string;
  name: string;
  sortOrder?: number | null;
};

export type ExpenseItem = {
  id: string;
  category: string;
  name: string;
  amountMonthly: number;
  amountPeriod?: number | null;
  periodLabel?: string | null;
  sortOrder?: number | null;
  bankAccountId?: string | null;
};

export type IncomeItem = {
  id: string;
  name: string;
  amountMonthly: number;
  amountPeriod?: number | null;
  periodLabel?: string | null;
  sortOrder?: number | null;
};
