"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Plus, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/lib/supabase/client";

type IncomeItem = {
  id: string;
  name: string;
  amountMonthly: number;
  sortOrder?: number | null;
};

const FALLBACK_INCOMES: IncomeItem[] = [
  {
    id: "salary-person1",
    name: "Person 1",
    amountMonthly: 28000,
    sortOrder: 1,
  },
  {
    id: "salary-person2",
    name: "Person 2",
    amountMonthly: 22000,
    sortOrder: 2,
  },
  {
    id: "bonus",
    name: "Bonus",
    amountMonthly: 5000,
    sortOrder: 3,
  },
];

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function formatCompactDkk(amount: number) {
  return `${moneyFormatter.format(amount).replace("DKK", "kr").trim()}`;
}

function bySortOrderAndName(a: IncomeItem, b: IncomeItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.name.localeCompare(b.name, "da-DK");
}

export default function IncomePage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingIncome, setIsLoadingIncome] = useState(false);
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadIncome = async (signedInUserId: string) => {
      setIsLoadingIncome(true);

      const { data, error } = await supabase
        .from("income_sources")
        .select("id, name, amount_monthly, sort_order")
        .eq("user_id", signedInUserId)
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error || !data || data.length === 0) {
        setIncomeItems(FALLBACK_INCOMES);
        setDataSource("fallback");
        setIsLoadingIncome(false);
        return;
      }

      const mapped = data
        .filter(
          (row) =>
            typeof row.amount_monthly === "number" &&
            typeof row.name === "string",
        )
        .map((row) => ({
          id: row.id ?? `income-${row.name}`,
          name: row.name,
          amountMonthly: row.amount_monthly,
          sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
        }))
        .sort(bySortOrderAndName);

      setIncomeItems(mapped);
      setDataSource("supabase");
      setIsLoadingIncome(false);
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

      setEmail(data.session.user.email ?? null);
      setUserId(data.session.user.id);
      await loadIncome(data.session.user.id);
      setIsCheckingSession(false);
    };

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/");
          return;
        }

        setEmail(session.user.email ?? null);
        setUserId(session.user.id);
        void loadIncome(session.user.id);
        setIsCheckingSession(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const totalIncomeMonthly = useMemo(
    () => incomeItems.reduce((sum, item) => sum + item.amountMonthly, 0),
    [incomeItems],
  );

  const totalCount = incomeItems.length;

  const resetAddIncomeForm = () => {
    setName("");
    setAmount("");
    setFormError(null);
  };

  const openAddIncomeModal = () => {
    setIsAddIncomeOpen(true);
    setFormError(null);
  };

  const closeAddIncomeModal = () => {
    setIsAddIncomeOpen(false);
    resetAddIncomeForm();
  };

  const handleSaveIncome = async () => {
    const parsedAmount = Number(amount.replace(",", "."));

    if (!name.trim()) {
      setFormError("Navn er påkrævet.");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Beløb skal være større end 0.");
      return;
    }

    if (!userId) {
      setFormError("Kunne ikke finde bruger. Prøv igen.");
      return;
    }

    setIsSavingIncome(true);
    setFormError(null);

    const nextSortOrder = incomeItems.length + 1;

    const payload = {
      user_id: userId,
      name: name.trim(),
      amount_monthly: parsedAmount,
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from("income_sources")
      .insert(payload)
      .select("id, name, amount_monthly, sort_order")
      .single();

    if (error) {
      setIsSavingIncome(false);
      setFormError("Kunne ikke gemme indkomst. Tjek at tabellen income_sources findes.");
      return;
    }

    const createdItem: IncomeItem = {
      id: data.id ?? `income-${payload.name}`,
      name: data.name,
      amountMonthly: data.amount_monthly,
      sortOrder: typeof data.sort_order === "number" ? data.sort_order : null,
    };

    setIncomeItems((current) => [...current, createdItem].sort(bySortOrderAndName));
    setDataSource("supabase");
    setIsSavingIncome(false);
    closeAddIncomeModal();
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100 px-4">
        <p className="rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] px-5 py-4 text-sm text-slate-600 dark:text-slate-300 shadow-[0_20px_60px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Tjekker session...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.88)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-6 sm:pt-8">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <header className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">Indkomst</h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">Indkomst efter skat (beregnes til månedlig)</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-700/70 text-slate-400 sm:h-12 sm:w-12 sm:rounded-2xl"
                aria-hidden="true"
              >
                <Settings size={20} strokeWidth={1.5} />
              </button>

              <button
                type="button"
                onClick={openAddIncomeModal}
                className="grid h-11 w-11 place-items-center rounded-xl border border-blue-400/30 bg-blue-500 text-white shadow-[0_15px_45px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-300/35 sm:h-12 sm:w-12 sm:rounded-2xl"
                aria-label="Tilføj indkomst"
              >
                <Plus size={20} strokeWidth={2} />
              </button>
            </div>
          </header>

          <div className="mt-8 rounded-3xl border border-white/10 bg-emerald-500/15 p-4 sm:p-8">
            <p className="text-sm font-medium text-slate-300">Samlet månedlig indkomst</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl sm:text-5xl font-bold text-emerald-300">
                {formatCompactDkk(totalIncomeMonthly)}
              </p>
              <p className="text-lg sm:text-xl font-semibold text-slate-300">{totalCount} kilder</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3">
            <p className="text-sm text-blue-100">
              <span className="font-semibold">Demo mode</span> – ændringer gemmes lokalt i din browser
            </p>
          </div>

          <div className="mt-6 space-y-3 sm:space-y-4">
            {incomeItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-slate-800/70"
              >
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-400">Navn</p>
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 text-rose-400 cursor-not-allowed opacity-50"
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                      <input
                        value={item.name}
                        disabled
                        className="h-12 sm:h-14 w-full rounded-2xl border border-white/10 bg-slate-600/40 px-4 text-lg sm:text-xl font-semibold text-white disabled:cursor-not-allowed"
                      />

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-2">Beløb</p>
                          <div className="h-12 sm:h-14 rounded-2xl border border-white/10 bg-slate-600/40 px-4 flex items-center">
                            <p className="text-base sm:text-lg font-semibold text-white">
                              {formatCompactDkk(item.amountMonthly)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-400 mb-2">Frekvens</p>
                          <div className="h-12 sm:h-14 rounded-2xl border border-white/10 bg-slate-600/40 px-4 flex items-center justify-between">
                            <p className="text-base sm:text-lg font-semibold text-white">Månedlig</p>
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            onClick={openAddIncomeModal}
            className="mt-6 w-full rounded-2xl border-2 border-dashed border-white/20 py-6 text-center text-white transition hover:border-white/40"
          >
            <span className="text-2xl">+</span> Tilføj indtægtskilde
          </button>

          {isLoadingIncome ? (
            <p className="mt-4 text-sm text-slate-400">Opdaterer indkomster...</p>
          ) : null}

          {dataSource === "fallback" ? (
            <p className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
              Viser demo-tal. Opret data i tabellen income_sources for at få live-indkomster.
            </p>
          ) : null}

          <p className="mt-6 text-xs text-slate-500">{email ?? ""}</p>
        </section>

        <BottomNav activeItem="Indkomst" />
      </div>

      {isAddIncomeOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" onClick={closeAddIncomeModal}>
          <section
            className="absolute left-1/2 top-1/2 w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-[1rem] border border-white/10 bg-slate-800 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)] max-h-[90vh] overflow-auto sm:top-auto sm:bottom-20 sm:-translate-y-0 sm:rounded-[2rem] sm:p-7"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tilføj indkomst"
          >
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Tilføj indkomst</h2>
              <button
                type="button"
                onClick={closeAddIncomeModal}
                className="text-2xl sm:text-4xl leading-none text-slate-400 transition hover:text-white"
                aria-label="Luk"
              >
                ×
              </button>
            </header>

            <div className="mt-5 space-y-3 sm:space-y-4">
              <label className="block">
                <span className="mb-2 block text-xl font-medium text-slate-200">Navn</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="f.eks. Løn"
                  className="h-12 sm:h-16 w-full rounded-2xl border border-white/10 bg-slate-600/65 px-5 text-xl sm:text-2xl text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xl font-medium text-slate-200">Beløb</span>
                <div className="relative">
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-12 sm:h-16 w-full rounded-2xl border border-white/10 bg-slate-600/65 px-5 pr-16 text-xl sm:text-2xl text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20"
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg sm:text-xl text-slate-300">
                    kr
                  </span>
                </div>
              </label>

              {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

              <button
                type="button"
                onClick={handleSaveIncome}
                disabled={isSavingIncome}
                className="mt-2 flex h-12 sm:h-16 w-full items-center justify-center rounded-2xl bg-blue-500 text-xl sm:text-2xl font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingIncome ? "Gemmer..." : "✓ Gem"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
