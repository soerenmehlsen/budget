export const cacheTags = {
  expenses: (userId: string) => `expenses-${userId}`,
  income: (userId: string) => `income-${userId}`,
  bankAccounts: (userId: string) => `bank-accounts-${userId}`,
  dashboard: (userId: string) => `dashboard-${userId}`,
};
