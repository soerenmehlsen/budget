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
  const [fetchResult, setFetchResult] = useState<BankAccount[] | null>(null);

  // Show cached data instantly while fetch is in progress
  useEffect(() => {
    if (!userId || fetchResult !== null) return;
    const cached = readCachedData<BankAccount[]>(CACHE_KEYS.bankAccounts, userId);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBankAccounts(cached.data);
    }
  }, [userId, fetchResult]);

  // Fire immediately — server action validates auth via session cookie
  useEffect(() => {
    if (isDemoMode()) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);

    fetchBankAccounts()
      .then((accounts) => {
        if (!isMounted) return;
        setBankAccounts(accounts);
        setFetchResult(accounts);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Kunne ikke hente bankkonti.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Write cache once userId is known and fresh data is available
  useEffect(() => {
    if (!userId || fetchResult === null) return;
    writeCachedData(CACHE_KEYS.bankAccounts, userId, fetchResult, "supabase");
  }, [userId, fetchResult]);

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
