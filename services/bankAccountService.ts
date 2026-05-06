"use server";

import { createClient } from "@/lib/supabase/server";
import type { BankAccount } from "@/types/budget";

const BANK_ACCOUNT_FIELDS = "id, name, sort_order";

function bySortOrderAndName(a: BankAccount, b: BankAccount) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name, "da-DK");
}

function mapRow(row: { id: string; name: string; sort_order: number | null }): BankAccount {
  return {
    id: row.id,
    name: row.name,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
  };
}

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");
  return { supabase, userId: user.id };
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  const { supabase } = await requireUserId();

  const { data, error } = await supabase
    .from("bank_accounts")
    .select(BANK_ACCOUNT_FIELDS)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => typeof row.id === "string" && typeof row.name === "string")
    .map(mapRow)
    .sort(bySortOrderAndName);
}

export async function createBankAccount(name: string, sortOrder: number): Promise<BankAccount> {
  const { supabase, userId } = await requireUserId();

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select(BANK_ACCOUNT_FIELDS)
    .single();

  if (error) throw error;

  return mapRow(data);
}

export async function updateBankAccount(id: string, name: string): Promise<void> {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("bank_accounts")
    .update({ name })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { supabase } = await requireUserId();

  const { error } = await supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
