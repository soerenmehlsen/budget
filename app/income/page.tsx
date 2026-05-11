import { getUser } from "@/lib/supabase/server";
import { fetchIncome } from "@/services/incomeService";
import type { IncomeItem } from "@/types/budget";
import { IncomeClient } from "./income-client";

export default async function IncomePage() {
  const user = await getUser();

  if (!user) {
    return <IncomeClient userId={null} initialData={null} />;
  }

  let initialData: IncomeItem[] | null = null;
  try {
    initialData = await fetchIncome();
  } catch {
    // Fall back to client-side fetch on SSR error
  }

  return <IncomeClient userId={user.id} initialData={initialData} />;
}
