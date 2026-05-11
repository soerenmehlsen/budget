import { createClient } from "@/lib/supabase/server";
import { fetchExpenses } from "@/services/expenseService";
import { fetchBankAccounts } from "@/services/bankAccountService";
import type { BankAccount, ExpenseItem } from "@/types/budget";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ExpensesClient userId={null} initialData={null} />;
  }

  let initialData: { expenses: ExpenseItem[]; accounts: BankAccount[] } | null = null;
  try {
    const [expenses, accounts] = await Promise.all([fetchExpenses(), fetchBankAccounts()]);
    initialData = { expenses, accounts };
  } catch {
    // Fall back to client-side fetch on SSR error
  }

  return <ExpensesClient userId={user.id} initialData={initialData} />;
}
