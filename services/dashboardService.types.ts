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
