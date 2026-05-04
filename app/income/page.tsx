"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteIcon } from "@/components/ui/delete";
import { SquarePenIcon } from "@/components/ui/square-pen";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import {
  createIncome,
  deleteIncome,
  fetchIncome,
  updateIncome,
  type IncomeItem,
} from "@/services/incomeService";
import { supabase } from "@/lib/supabase/client";

type Frequency = "monthly" | "quarterly" | "halfYearly" | "yearly";

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

function frequencyToPeriodLabel(frequency: Frequency) {
  switch (frequency) {
    case "monthly":
      return "måned";
    case "quarterly":
      return "kvartal";
    case "halfYearly":
      return "halvår";
    case "yearly":
      return "år";
    default:
      return "måned";
  }
}

function frequencyToMonthlyAmount(amount: number, frequency: Frequency) {
  switch (frequency) {
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "halfYearly":
      return amount / 6;
    case "yearly":
      return amount / 12;
    default:
      return amount;
  }
}

function periodLabelToFrequencyText(periodLabel: string | null | undefined) {
  switch (periodLabel) {
    case "kvartal":
      return "Kvartalsvis";
    case "halvår":
      return "Halvårlig";
    case "år":
      return "Årlig";
    default:
      return "Månedlig";
  }
}

function incomeItemToFrequency(item: IncomeItem): Frequency {
  switch (item.periodLabel) {
    case "kvartal":
      return "quarterly";
    case "halvår":
      return "halfYearly";
    case "år":
      return "yearly";
    default:
      return "monthly";
  }
}

export default function IncomePage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingIncome, setIsLoadingIncome] = useState(false);
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadIncome = async (signedInUserId: string) => {
      const cached = readCachedData<IncomeItem[]>(CACHE_KEYS.income, signedInUserId);

      if (cached) {
        setIncomeItems(cached.data);
        setDataSource(cached.source);
      }

      setIsLoadingIncome(true);

      try {
        const items = await fetchIncome(signedInUserId);

        if (!isMounted) return;

        if (items.length === 0) {
          setIncomeItems(FALLBACK_INCOMES);
          setDataSource("fallback");
          writeCachedData(CACHE_KEYS.income, signedInUserId, FALLBACK_INCOMES, "fallback");
        } else {
          const sorted = [...items].sort(bySortOrderAndName);
          setIncomeItems(sorted);
          setDataSource("supabase");
          writeCachedData(CACHE_KEYS.income, signedInUserId, sorted, "supabase");
        }
      } catch {
        if (!isMounted) return;
        setIncomeItems(FALLBACK_INCOMES);
        setDataSource("fallback");
      }

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

  const resetAddIncomeForm = () => {
    setEditingIncomeId(null);
    setName("");
    setAmount("");
    setFrequency("monthly");
    setFormError(null);
  };

  const openAddIncomeModal = () => {
    resetAddIncomeForm();
    setIsAddIncomeOpen(true);
    setFormError(null);
  };

  const openEditIncomeModal = (item: IncomeItem) => {
    setEditingIncomeId(item.id);
    setName(item.name);
    setAmount(String(item.amountPeriod ?? item.amountMonthly));
    setFrequency(incomeItemToFrequency(item));
    setFormError(null);
    setIsAddIncomeOpen(true);
  };

  const closeAddIncomeModal = () => {
    setIsAddIncomeOpen(false);
    resetAddIncomeForm();
  };

  const handleSaveIncome = async () => {
    const parsedAmount = Number(amount.replace(",", "."));
    const isEditingIncome = editingIncomeId !== null;

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

    const existingIncome = incomeItems.find((item) => item.id === editingIncomeId);
    const nextSortOrder = isEditingIncome
      ? existingIncome?.sortOrder ?? incomeItems.length
      : incomeItems.length + 1;
    const monthlyAmount = frequencyToMonthlyAmount(parsedAmount, frequency);
    const periodLabel = frequencyToPeriodLabel(frequency);
    const periodAmount = frequency === "monthly" ? null : parsedAmount;

    const saveParams = {
      userId,
      name: name.trim(),
      amountMonthly: monthlyAmount,
      amountPeriod: periodAmount,
      periodLabel: periodAmount === null ? null : periodLabel,
      sortOrder: nextSortOrder,
    };

    let savedItem: IncomeItem;

    try {
      savedItem = isEditingIncome
        ? await updateIncome(editingIncomeId, userId, saveParams)
        : await createIncome(saveParams);
    } catch {
      setIsSavingIncome(false);
      setFormError(
        isEditingIncome
          ? "Kunne ikke opdatere indkomst. Prøv igen."
          : "Kunne ikke gemme indkomst. Tjek at tabellen income_sources findes.",
      );
      return;
    }

    const nextIncomeItems = (
      isEditingIncome
        ? incomeItems.map((item) => (item.id === editingIncomeId ? savedItem : item))
        : [...incomeItems, savedItem]
    ).sort(bySortOrderAndName);

    setIncomeItems(nextIncomeItems);
    writeCachedData(CACHE_KEYS.income, userId, nextIncomeItems, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");
    setIsSavingIncome(false);
    closeAddIncomeModal();
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!userId) {
      setFormError("Kunne ikke finde bruger. Prøv igen.");
      return;
    }

    const isConfirmed = window.confirm("Vil du slette denne indtægtskilde?");

    if (!isConfirmed) {
      return;
    }

    try {
      await deleteIncome(incomeId, userId);
    } catch {
      setFormError("Kunne ikke slette indkomst. Prøv igen.");
      return;
    }

    const nextIncomeItems = incomeItems.filter((item) => item.id !== incomeId);
    setIncomeItems(nextIncomeItems);
    writeCachedData(CACHE_KEYS.income, userId, nextIncomeItems, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");

    if (editingIncomeId === incomeId) {
      closeAddIncomeModal();
    }
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

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">
          <header className="flex items-start justify-between gap-3 px-1 sm:gap-4 sm:px-0">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Indkomst</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">Indkomst efter skat (beregnes til månedlig)</p>
            </div>

          </header>

          {dataSource === "fallback" ? (
            <p className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
              Viser test data. Tilføj selv din <span className="font-semibold">indkomst</span> for at få overblik over din økonomi.
            </p>
          ) : null}

          <div className="mt-6 space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {incomeItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/70"
              >
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Navn</p>
                        <div className="flex items-center gap-3">
                          <AnimatedIconButton
                            type="button"
                            onClick={() => openEditIncomeModal(item)}
                            Icon={SquarePenIcon}
                            iconSize={16}
                            className="inline-flex text-sm items-center gap-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            aria-label="Rediger indkomst"
                          >
                            Rediger
                          </AnimatedIconButton>
                          <AnimatedIconButton
                            type="button"
                            onClick={() => handleDeleteIncome(item.id)}
                            Icon={DeleteIcon}
                            iconSize={16}
                            className="inline-flex items-center gap-1.5 text-rose-500 transition hover:text-rose-400"
                            aria-label="Slet indkomst"
                          />
                        </div>
                      </div>
                      <input
                        value={item.name}
                        disabled
                        className="h-11 w-full rounded-2xl border border-slate-300 bg-slate-100 px-4 text-base font-semibold text-slate-900 disabled:cursor-not-allowed dark:border-white/10 dark:bg-slate-600/40 dark:text-white sm:h-12 sm:text-lg lg:text-base"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Beløb</p>
                          <div className="flex min-h-11 flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-slate-600/40 sm:min-h-12 lg:min-h-14">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                              {formatCompactDkk(item.amountMonthly)}
                            </p>
                            {typeof item.amountPeriod === "number" && item.periodLabel ? (
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {formatCompactDkk(item.amountPeriod)}/{item.periodLabel}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Frekvens</p>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-white/10 dark:bg-slate-600/40 sm:h-12">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                              {periodLabelToFrequencyText(item.periodLabel)}
                            </p>
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
            className="mt-6 w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 text-center text-slate-700 transition hover:border-slate-400 dark:border-white/20 dark:text-white dark:hover:border-white/40"
          >
            <span className="text-2xl">+</span> Tilføj indtægtskilde
          </button>

          {isLoadingIncome ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Opdaterer indkomster...</p>
          ) : null}

          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-400/20 dark:bg-blue-400/10">
            <p className="text-sm text-blue-800 dark:text-blue-100">
              <span className="font-semibold">Tip:</span> Indtast din netto-løn (efter skat, AM-bidrag mv.). Det beløb du faktisk får udbetalt hver måned.
            </p>
          </div>
        </section>

        <BottomNav activeItem="Indkomst" />
      </div>

      {isAddIncomeOpen ? (
        <motion.div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={closeAddIncomeModal}
        >
          <div className="absolute left-1/2 top-1/2 w-[calc(100%-1rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:bottom-20 sm:w-[calc(100%-2rem)] sm:max-w-[600px] sm:-translate-y-0 lg:bottom-auto lg:top-1/2 lg:max-w-[620px] lg:-translate-y-1/2">
            <motion.section
              className="max-h-[82dvh] overflow-auto rounded-[1rem] border border-slate-200 bg-white p-4 shadow-[0_25px_80px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_25px_80px_rgba(0,0,0,0.5)] sm:rounded-[1.5rem] sm:p-5 lg:rounded-[1.5rem]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={editingIncomeId ? "Rediger indkomst" : "Tilføj indkomst"}
            >
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
                {editingIncomeId ? "Rediger indkomst" : "Tilføj indkomst"}
              </h2>
              <button
                type="button"
                onClick={closeAddIncomeModal}
                className="text-xl leading-none text-slate-400 transition hover:text-slate-900 dark:hover:text-white sm:text-2xl"
                aria-label="Luk"
              >
                ×
              </button>
            </header>

            <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3 lg:space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Navn</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="f.eks. Løn"
                  className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-lg"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Beløb</span>
                <div className="relative">
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 pr-14 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:pr-14 sm:text-lg"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                    kr
                  </span>
                </div>
              </label>

              <fieldset>
                <legend className="mb-2 text-base font-medium text-slate-900 dark:text-slate-200 sm:text-base">Frekvens</legend>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { value: "monthly", label: "Månedlig" },
                    { value: "quarterly", label: "Kvartalsvis" },
                    { value: "halfYearly", label: "Halvårlig" },
                    { value: "yearly", label: "Årlig" },
                  ].map((option) => {
                    const isActive = frequency === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFrequency(option.value as Frequency)}
                        className={`h-10 rounded-2xl border text-sm font-medium transition sm:h-12 sm:text-base ${
                          isActive
                            ? "border-blue-400 bg-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 dark:border-white/15 dark:bg-slate-700/40 dark:text-slate-300 dark:hover:border-white/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {formError ? <p className="text-xs text-rose-600 dark:text-rose-300 sm:text-sm">{formError}</p> : null}

              <button
                type="button"
                onClick={handleSaveIncome}
                disabled={isSavingIncome}
                className="mt-1 flex h-10 w-full items-center justify-center rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-2 sm:h-12 sm:text-lg"
              >
                {isSavingIncome ? "Gemmer..." : editingIncomeId ? "Gem ændringer" : "Gem"}
              </button>
            </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </main>
  );
}
