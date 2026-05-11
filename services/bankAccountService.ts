"use server";

import { unstable_cache, revalidateTag } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cacheTags } from "@/lib/cache-tags";
import type { BankAccount } from "@/types/budget";
import { bySortOrderAndName } from "@/lib/utils";

const BANK_ACCOUNT_FIELDS = "id, name, sort_order";

function mapRow(row: { id: string; name: string; sort_order: number | null }): BankAccount {
  return {
    id: row.id,
    name: row.name,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
  };
}

async function requireUserId() {
  const user = await getUser();
  if (!user) throw new Error("Ikke logget ind");
  const supabase = await createClient();
  return { supabase, userId: user.id };
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { userId } = await requireUserId();
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("bank_accounts")
        .select(BANK_ACCOUNT_FIELDS)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? [])
        .filter((row) => typeof row.id === "string" && typeof row.name === "string")
        .map(mapRow)
        .sort(bySortOrderAndName);
    },
    [cacheTags.bankAccounts(userId)],
    { revalidate: 60, tags: [cacheTags.bankAccounts(userId)] },
  )();
}

export async function createBankAccount(name: string, sortOrder: number): Promise<BankAccount> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select(BANK_ACCOUNT_FIELDS)
    .single();

  if (error) throw error;

  revalidateTag(cacheTags.bankAccounts(userId), "default");
  revalidateTag(cacheTags.dashboard(userId), "default");

  return mapRow(data);
}

export async function updateBankAccount(id: string, name: string): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase
    .from("bank_accounts")
    .update({ name })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  revalidateTag(cacheTags.bankAccounts(userId), "default");
  revalidateTag(cacheTags.dashboard(userId), "default");
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;

  revalidateTag(cacheTags.bankAccounts(userId), "default");
  revalidateTag(cacheTags.dashboard(userId), "default");
}
