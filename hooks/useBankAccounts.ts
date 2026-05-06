"use client";

import { useEffect, useState } from "react";
import {
  createBankAccount,
  deleteBankAccount as deleteBankAccountInDb,
  fetchBankAccounts,
  updateBankAccount as updateBankAccountInDb,
} from "@/services/bankAccountService";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import { isDemoMode } from "@/lib/demo-mode";
import type { BankAccount } from "@/types/budget";

const FALLBACK_BANK_ACCOUNTS: BankAccount[] = [
  { id: "demo-budgetkonto", name: "Budgetkonto", sortOrder: 1 },
  { id: "demo-opsparingskonto", name: "Opsparingskonto", sortOrder: 2 },
];

export function useBankAccounts(userId: string | null) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() =>
    !userId && isDemoMode() ? FALLBACK_BANK_ACCOUNTS : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const loadData = async () => {
      const cached = readCachedData<BankAccount[]>(CACHE_KEYS.bankAccounts, userId);
      if (cached) {
        setBankAccounts(cached.data);
      }

      setIsLoading(true);

      try {
        const accounts = await fetchBankAccounts();

        if (!isMounted) return;

        if (accounts.length === 0 && isDemoMode()) {
          setBankAccounts(FALLBACK_BANK_ACCOUNTS);
          writeCachedData(CACHE_KEYS.bankAccounts, userId, FALLBACK_BANK_ACCOUNTS, "fallback");
        } else {
          setBankAccounts(accounts);
          writeCachedData(CACHE_KEYS.bankAccounts, userId, accounts, "supabase");
        }
      } catch {
        if (!isMounted) return;
        if (isDemoMode()) setBankAccounts(FALLBACK_BANK_ACCOUNTS);
        else setError("Kunne ikke hente bankkonti.");
      }

      if (isMounted) setIsLoading(false);
    };

    void loadData();

    return () => { isMounted = false; };
  }, [userId]);

  const addBankAccount = async (name: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await createBankAccount(name, bankAccounts.length + 1);
      const next = [...bankAccounts, saved];
      setBankAccounts(next);
      writeCachedData(CACHE_KEYS.bankAccounts, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setMessage("Kontoen er gemt.");
    } catch {
      setError("Kunne ikke gemme kontoen.");
      throw new Error("Kunne ikke gemme kontoen.");
    } finally {
      setIsSaving(false);
    }
  };

  const editBankAccount = async (id: string, name: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateBankAccountInDb(id, name);
      const next = bankAccounts.map((a) => (a.id === id ? { ...a, name } : a));
      setBankAccounts(next);
      writeCachedData(CACHE_KEYS.bankAccounts, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setMessage("Kontoen er opdateret.");
    } catch {
      setError("Kunne ikke opdatere kontoen. Prøv igen.");
      throw new Error("Kunne ikke opdatere kontoen.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeBankAccount = async (id: string): Promise<void> => {
    if (!userId) throw new Error("Ikke logget ind");
    try {
      await deleteBankAccountInDb(id);
      const next = bankAccounts.filter((a) => a.id !== id);
      setBankAccounts(next);
      writeCachedData(CACHE_KEYS.bankAccounts, userId, next, "supabase");
      invalidateDashboardCache(userId);
      setMessage("Kontoen er slettet.");
    } catch {
      setError("Kunne ikke slette kontoen. Prøv igen.");
      throw new Error("Kunne ikke slette kontoen.");
    }
  };

  return {
    bankAccounts,
    isLoading,
    isSaving,
    error,
    message,
    clearMessages: () => { setError(null); setMessage(null); },
    addBankAccount,
    editBankAccount,
    removeBankAccount,
  };
}
