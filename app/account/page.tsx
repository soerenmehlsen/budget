"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteIcon } from "@/components/ui/delete";
import { LogoutIcon, type LogoutIconHandle } from "@/components/ui/logout";
import { PlusIcon } from "@/components/ui/plus";
import { supabase } from "@/lib/supabase/client";
import type { BankAccount } from "@/types/budget";

function bySortOrderAndName(a: BankAccount, b: BankAccount) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.name.localeCompare(b.name, "da-DK");
}

export default function AccountPage() {
  const router = useRouter();
  const logoutIconRef = useRef<LogoutIconHandle>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accountName, setAccountName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBankAccounts = async (signedInUserId: string) => {
      setIsLoadingAccounts(true);

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, sort_order")
        .eq("user_id", signedInUserId)
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setAccountError("Kunne ikke hente bankkonti. Tjek at tabellen bank_accounts findes.");
        setBankAccounts([]);
        setIsLoadingAccounts(false);
        return;
      }

      const mapped = (data ?? [])
        .filter((row) => typeof row.id === "string" && typeof row.name === "string")
        .map((row) => ({
          id: row.id,
          name: row.name,
          sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
        }))
        .sort(bySortOrderAndName);

      setBankAccounts(mapped);
      setIsLoadingAccounts(false);
    };

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!data.session) {
        router.replace("/");
        return;
      }

      setUserId(data.session.user.id);
      await loadBankAccounts(data.session.user.id);
      setIsCheckingSession(false);
    };

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/");
          return;
        }

        setUserId(session.user.id);
        void loadBankAccounts(session.user.id);
        setIsCheckingSession(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

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

    const payload = {
      user_id: userId,
      name: accountName.trim(),
      sort_order: bankAccounts.length + 1,
    };

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert(payload)
      .select("id, name, sort_order")
      .single();

    setIsSavingAccount(false);

    if (error) {
      setAccountError("Kunne ikke gemme kontoen. Tjek at tabellen bank_accounts findes.");
      return;
    }

    const savedAccount: BankAccount = {
      id: data.id ?? `bank-account-${payload.name}`,
      name: data.name,
      sortOrder: typeof data.sort_order === "number" ? data.sort_order : null,
    };

    setBankAccounts((current) => [...current, savedAccount].sort(bySortOrderAndName));
    setAccountName("");
    setAccountMessage("Kontoen er gemt.");
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!userId) {
      setAccountError("Kunne ikke finde bruger. Prøv igen.");
      return;
    }

    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", userId);

    if (error) {
      setAccountError("Kunne ikke slette kontoen. Prøv igen.");
      return;
    }

    setBankAccounts((current) => current.filter((account) => account.id !== accountId));
    setAccountMessage("Kontoen er slettet.");
  };

  const handleSendFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!feedback.trim()) {
      setFeedbackError("Skriv din feedback først.");
      setFeedbackMessage(null);
      return;
    }

    if (!userId) {
      setFeedbackError("Kunne ikke finde bruger. Prøv igen.");
      setFeedbackMessage(null);
      return;
    }

    setIsSendingFeedback(true);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      message: feedback.trim(),
      source: "account_page",
    });

    setIsSendingFeedback(false);

    if (error) {
      setFeedbackError("Kunne ikke sende feedback. Tjek at tabellen feedback findes.");
      return;
    }

    setFeedback("");
    setFeedbackMessage("Tak. Din feedback er sendt.");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
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
          <header className="flex items-start justify-between gap-3 px-1 sm:gap-4 sm:px-0">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Konto</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                Dine bankkonti og feedback
              </p>
            </div>
          </header>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bankkonti</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Tilføj navnene på de konti, du vil bruge senere.
                  </p>
                </div>
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {bankAccounts.length}
                </span>
              </div>

              <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleAddBankAccount}>
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
                  disabled={isSavingAccount}
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
                {bankAccounts.map((account) => (
                  <article
                    key={account.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-700/45"
                  >
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                      {account.name}
                    </p>
                    <AnimatedIconButton
                      type="button"
                      onClick={() => handleDeleteBankAccount(account.id)}
                      Icon={DeleteIcon}
                      iconSize={16}
                      className="inline-flex shrink-0 items-center gap-1.5 text-sm text-rose-500 transition hover:text-rose-400"
                      aria-label={`Slet ${account.name}`}
                    >
                      Slet
                    </AnimatedIconButton>
                  </article>
                ))}

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

            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Feedback</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Send ideer, fejl eller ønsker direkte til udvikleren.
              </p>

              <form className="mt-4 space-y-3" onSubmit={handleSendFeedback}>
                <label className="block">
                  <span className="sr-only">Feedback</span>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Skriv din feedback her..."
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400"
                  />
                </label>

                {feedbackError ? (
                  <p className="text-sm text-rose-600 dark:text-rose-300">{feedbackError}</p>
                ) : null}
                {feedbackMessage ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{feedbackMessage}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSendingFeedback}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
                >
                  {isSendingFeedback ? "Sender..." : "Send feedback"}
                </button>
              </form>
            </section>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            onMouseEnter={() => logoutIconRef.current?.startAnimation()}
            onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-300/25 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
          >
            <LogoutIcon ref={logoutIconRef} size={18} />
            Log ud
          </button>
        </section>

        <BottomNav activeItem="Konto" />
      </div>
    </main>
  );
}
