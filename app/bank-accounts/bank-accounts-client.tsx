"use client";

import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteIcon } from "@/components/ui/delete";
import { PlusIcon } from "@/components/ui/plus";
import { SquarePenIcon } from "@/components/ui/square-pen";
import { useSession } from "@/hooks/useSession";
import {
  createBankAccount,
  deleteBankAccount,
  fetchBankAccounts,
  updateBankAccount,
} from "@/services/bankAccountService";
import type { BankAccount } from "@/types/budget";
import { isDemoMode } from "@/lib/demo-mode";
import { useEffect } from "react";

const DEMO_BANK_ACCOUNTS: BankAccount[] = [
  { id: "demo-budgetkonto", name: "Budgetkonto", sortOrder: 1 },
  { id: "demo-opsparingskonto", name: "Opsparingskonto", sortOrder: 2 },
];

export function BankAccountsClient() {
  const { userId, isCheckingSession } = useSession();

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() =>
    isDemoMode() ? DEMO_BANK_ACCOUNTS : [],
  );
  const [accountName, setAccountName] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  useEffect(() => {
    if (isCheckingSession) return;

    if (!userId) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingAccounts(true);

    fetchBankAccounts(userId)
      .then((accounts) => {
        if (isMounted) setBankAccounts(accounts);
      })
      .catch(() => {
        if (isMounted) setAccountError("Kunne ikke hente bankkonti.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingAccounts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, isCheckingSession]);

  const handleAddBankAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accountName.trim()) {
      setAccountError("Skriv navnet på kontoen først.");
      setAccountMessage(null);
      return;
    }

    if (!userId) {
      setAccountError("Kunne ikke finde bruger. Prøv igen.");
      setAccountMessage(null);
      return;
    }

    setIsSavingAccount(true);
    setAccountError(null);
    setAccountMessage(null);

    try {
      const saved = await createBankAccount(userId, accountName.trim(), bankAccounts.length + 1);
      setBankAccounts((current) => [...current, saved]);
      setAccountName("");
      setAccountMessage("Kontoen er gemt.");
    } catch {
      setAccountError("Kunne ikke gemme kontoen.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!userId) {
      setAccountError("Kunne ikke finde bruger. Prøv igen.");
      return;
    }

    try {
      await deleteBankAccount(accountId, userId);
      setBankAccounts((current) => current.filter((a) => a.id !== accountId));
      setAccountMessage("Kontoen er slettet.");
    } catch {
      setAccountError("Kunne ikke slette kontoen. Prøv igen.");
    }
  };

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setEditingName(account.name);
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingName("");
  };

  const handleSaveEdit = async () => {
    if (!editingAccountId || !editingName.trim() || !userId) return;

    setIsSavingEdit(true);
    setAccountError(null);

    try {
      await updateBankAccount(editingAccountId, userId, editingName.trim());
      setBankAccounts((current) =>
        current.map((a) => (a.id === editingAccountId ? { ...a, name: editingName.trim() } : a)),
      );
      setEditingAccountId(null);
      setEditingName("");
      setAccountMessage("Kontoen er opdateret.");
    } catch {
      setAccountError("Kunne ikke opdatere kontoen. Prøv igen.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
        <p className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm text-slate-600 shadow-[0_20px_60px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          Tjekker session...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.88)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="px-1 sm:px-0"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Bankkonti</h1>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                  Tilføj dine bankkonti for at kunne beregne dine faste overførsler.
                </p>
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                {bankAccounts.length}
              </span>
            </div>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-6"
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleAddBankAccount}>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Kontonavn</span>
                  <input
                    value={accountName}
                    onChange={(event) => setAccountName(event.target.value)}
                    placeholder="f.eks. Lønkonto"
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12"
                  />
                </label>
                <AnimatedIconButton
                  type="submit"
                  disabled={isSavingAccount || !accountName.trim()}
                  Icon={PlusIcon}
                  iconSize={18}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
                  aria-label="Tilføj bankkonto"
                >
                  {isSavingAccount ? "Gemmer..." : "Tilføj"}
                </AnimatedIconButton>
              </form>

              {accountError ? (
                <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{accountError}</p>
              ) : null}
              {accountMessage ? (
                <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{accountMessage}</p>
              ) : null}

              <div className="mt-4 space-y-3">
                {bankAccounts.map((account) =>
                  editingAccountId === account.id ? (
                    <article
                      key={account.id}
                      className="flex items-center gap-2 rounded-2xl border border-blue-300 bg-slate-50 px-3 py-2 dark:border-blue-500/40 dark:bg-slate-700/45"
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit()}
                        disabled={isSavingEdit}
                        className="shrink-0 rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
                      >
                        {isSavingEdit ? "Gemmer..." : "Gem"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      >
                        Annuller
                      </button>
                    </article>
                  ) : (
                    <article
                      key={account.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-700/45"
                    >
                      <p className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                        {account.name}
                      </p>
                      <div className="flex shrink-0 items-center gap-3">
                        <AnimatedIconButton
                          type="button"
                          onClick={() => handleStartEdit(account)}
                          Icon={SquarePenIcon}
                          iconSize={16}
                          className="inline-flex items-center text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                          aria-label={`Rediger ${account.name}`}
                        />
                        <AnimatedIconButton
                          type="button"
                          onClick={() => handleDeleteBankAccount(account.id)}
                          Icon={DeleteIcon}
                          iconSize={16}
                          className="inline-flex items-center text-rose-500 transition hover:text-rose-400"
                          aria-label={`Slet ${account.name}`}
                        />
                      </div>
                    </article>
                  ),
                )}

                {!isLoadingAccounts && bankAccounts.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-600 dark:border-white/20 dark:text-slate-400">
                    Ingen bankkonti tilføjet endnu.
                  </p>
                ) : null}
              </div>

              {isLoadingAccounts ? (
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Henter bankkonti...</p>
              ) : null}
            </section>
          </motion.div>
        </section>

        <BottomNav activeItem="Bankkonti" />
      </div>
    </main>
  );
}
