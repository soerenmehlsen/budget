import { getUser } from "@/lib/supabase/server";
import { fetchBankAccounts } from "@/services/bankAccountService";
import type { BankAccount } from "@/types/budget";
import { BankAccountsClient } from "./bank-accounts-client";

export default async function BankAccountsPage() {
  const user = await getUser();

  if (!user) {
    return <BankAccountsClient userId={null} initialData={null} />;
  }

  let initialData: BankAccount[] | null = null;
  try {
    initialData = await fetchBankAccounts();
  } catch {
    // Fall back to client-side fetch on SSR error
  }

  return <BankAccountsClient userId={user.id} initialData={initialData} />;
}
