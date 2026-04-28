"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { supabase } from "@/lib/supabase/client";

type Frequency = "monthly" | "quarterly" | "halfYearly" | "yearly";

type ExpenseItem = {
  id: string;
  category: string;
  name: string;
  amountMonthly: number;
  amountPeriod?: number | null;
  periodLabel?: string | null;
  sortOrder?: number | null;
};

const FALLBACK_EXPENSES: ExpenseItem[] = [
  {
    id: "house-rent",
    category: "Bolig",
    name: "Husleje/boliglån",
    amountMonthly: 12000,
    sortOrder: 1,
  },
  {
    id: "house-tax",
    category: "Bolig",
    name: "Ejendomsskat",
    amountMonthly: 1500,
    amountPeriod: 18000,
    periodLabel: "år",
    sortOrder: 2,
  },
  {
    id: "utility-heat",
    category: "Forbrug",
    name: "Varme",
    amountMonthly: 800,
    sortOrder: 1,
  },
  {
    id: "utility-electricity",
    category: "Forbrug",
    name: "El",
    amountMonthly: 600,
    sortOrder: 2,
  },
  {
    id: "utility-water",
    category: "Forbrug",
    name: "Vand",
    amountMonthly: 800,
    amountPeriod: 2400,
    periodLabel: "kvartal",
    sortOrder: 3,
  },
  {
    id: "utility-internet",
    category: "Forbrug",
    name: "Internet",
    amountMonthly: 299,
    sortOrder: 4,
  },
];

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const CATEGORIES = [
  "Bolig",
  "Forbrug",
  "Transport",
  "Abonnementer",
  "Forsikring",
  "Diverse",
];

function formatCompactDkk(amount: number) {
  return `${moneyFormatter.format(amount).replace("DKK", "kr").trim()}`;
}

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
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

export default function ExpensesPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Abonnementer");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadExpenses = async (signedInUserId: string) => {
      setIsLoadingExpenses(true);

      const { data, error } = await supabase
        .from("expense_items")
        .select("id, category, name, amount_monthly, amount_annual, sort_order")
        .eq("user_id", signedInUserId)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error || !data || data.length === 0) {
        setExpenseItems(FALLBACK_EXPENSES);
        setDataSource("fallback");
        setIsLoadingExpenses(false);
        return;
      }

      const mapped = data
        .filter(
          (row) =>
            typeof row.amount_monthly === "number" &&
            typeof row.category === "string" &&
            typeof row.name === "string",
        )
        .map((row) => ({
          id: row.id ?? `${row.category}-${row.name}`,
          category: row.category,
          name: row.name,
          amountMonthly: row.amount_monthly,
          amountPeriod: typeof row.amount_annual === "number" ? row.amount_annual : null,
          periodLabel: typeof row.amount_annual === "number" ? "år" : null,
          sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
        }))
        .sort(bySortOrderAndName);

      setExpenseItems(mapped);
      setDataSource("supabase");
      setIsLoadingExpenses(false);
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
      await loadExpenses(data.session.user.id);
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
        void loadExpenses(session.user.id);
        setIsCheckingSession(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const groupedExpenses = useMemo(() => {
    const grouped = new Map<string, ExpenseItem[]>();

    for (const item of expenseItems) {
      const bucket = grouped.get(item.category) ?? [];
      bucket.push(item);
      grouped.set(item.category, bucket);
    }

    return Array.from(grouped.entries())
      .map(([groupCategory, items]) => ({
        category: groupCategory,
        items: [...items].sort(bySortOrderAndName),
        totalMonthly: items.reduce((total, item) => total + item.amountMonthly, 0),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, "da-DK"));
  }, [expenseItems]);

  const totalExpensesMonthly = useMemo(
    () => groupedExpenses.reduce((sum, group) => sum + group.totalMonthly, 0),
    [groupedExpenses],
  );

  const totalCount = expenseItems.length;

  const isAllCollapsed =
    groupedExpenses.length > 0 &&
    groupedExpenses.every((group) => collapsedCategories[group.category] === true);

  const resetAddExpenseForm = () => {
    setName("");
    setCategory("Abonnementer");
    setAmount("");
    setFrequency("monthly");
    setIsAdvancedOpen(false);
    setFormError(null);
  };

  const openAddExpenseModal = (preferredCategory?: string) => {
    if (preferredCategory) {
      setCategory(preferredCategory);
    }

    setIsAddExpenseOpen(true);
    setFormError(null);
  };

  const closeAddExpenseModal = () => {
    setIsAddExpenseOpen(false);
    resetAddExpenseForm();
  };

  const toggleAll = () => {
    const nextValue = !isAllCollapsed;
    const nextState: Record<string, boolean> = {};

    for (const group of groupedExpenses) {
      nextState[group.category] = nextValue;
    }

    setCollapsedCategories(nextState);
  };

  const handleSaveExpense = async () => {
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

    setIsSavingExpense(true);
    setFormError(null);

    const monthlyAmount = frequencyToMonthlyAmount(parsedAmount, frequency);
    const periodLabel = frequencyToPeriodLabel(frequency);
    const periodAmount = frequency === "monthly" ? null : parsedAmount;

    const groupItems = expenseItems.filter((item) => item.category === category);
    const nextSortOrder = groupItems.length + 1;

    const payload = {
      user_id: userId,
      category,
      name: name.trim(),
      amount_monthly: monthlyAmount,
      amount_annual: periodAmount,
      sort_order: nextSortOrder,
    };

    const { data, error } = await supabase
      .from("expense_items")
      .insert(payload)
      .select("id, category, name, amount_monthly, amount_annual, sort_order")
      .single();

    if (error) {
      setIsSavingExpense(false);
      setFormError("Kunne ikke gemme udgift. Tjek at tabellen expense_items findes.");
      return;
    }

    const createdItem: ExpenseItem = {
      id: data.id ?? `${payload.category}-${payload.name}`,
      category: data.category,
      name: data.name,
      amountMonthly: data.amount_monthly,
      amountPeriod: typeof data.amount_annual === "number" ? data.amount_annual : periodAmount,
      periodLabel:
        typeof data.amount_annual === "number"
          ? frequency === "yearly"
            ? "år"
            : periodLabel
          : null,
      sortOrder: typeof data.sort_order === "number" ? data.sort_order : null,
    };

    setExpenseItems((current) => [...current, createdItem].sort(bySortOrderAndName));
    setDataSource("supabase");
    setIsSavingExpense(false);
    closeAddExpenseModal();
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09111f] px-4 text-slate-100">
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Tjekker session...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09111f] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,17,31,0.88)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-6 sm:pt-8">
        <section className="mx-auto w-full rounded-[2rem] border border-white/10 bg-slate-900/55 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
          <header className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">Udgifter</h1>
              <p className="mt-0.5 text-xs text-slate-400 sm:mt-1 sm:text-sm">{totalCount} faste udgifter</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-700/70 text-slate-400 sm:h-12 sm:w-12 sm:rounded-2xl"
                aria-hidden="true"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9h18" />
                  <path d="M5 21h14" />
                  <path d="M7 9V6l5-3 5 3v3" />
                  <path d="M8 9v8" />
                  <path d="M12 9v8" />
                  <path d="M16 9v8" />
                </svg>
              </button>

              <button
                type="button"
                disabled
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-slate-700/70 text-slate-400 sm:h-12 sm:w-12 sm:rounded-2xl"
                aria-hidden="true"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82 2 2 0 1 1-2.83 2.83 1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.07a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33 2 2 0 1 1-2.83-2.83A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82 2 2 0 1 1 2.83-2.83 1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.07a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33 2 2 0 1 1 2.83 2.83A1.65 1.65 0 0 0 19.4 9v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => openAddExpenseModal()}
                className="grid h-11 w-11 place-items-center rounded-xl border border-blue-400/30 bg-blue-500 text-white shadow-[0_15px_45px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-300/35 sm:h-12 sm:w-12 sm:rounded-2xl"
                aria-label="Tilføj udgift"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            </div>
          </header>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition ${isAllCollapsed ? "rotate-0" : "rotate-180"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
              {isAllCollapsed ? "Fold alle ud" : "Fold alle ind"}
            </button>

            <p className="text-sm text-slate-300">{formatCompactDkk(totalExpensesMonthly)}/md</p>
          </div>

          <div className="mt-4 space-y-4">
            {groupedExpenses.map((group) => {
              const isCollapsed = collapsedCategories[group.category] === true;

              return (
                <article
                  key={group.category}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-3"
                      onClick={() =>
                        setCollapsedCategories((current) => ({
                          ...current,
                          [group.category]: !isCollapsed,
                        }))
                      }
                      aria-label={`Skift visning for ${group.category}`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className={`h-5 w-5 text-slate-400 transition ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>

                      <h2 className="truncate text-xl font-semibold text-white">{group.category}</h2>

                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-300">
                        {group.items.length}
                      </span>
                    </button>

                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-white sm:text-2xl">
                        {formatCompactDkk(group.totalMonthly)}/md
                      </p>

                      <button
                        type="button"
                        onClick={() => openAddExpenseModal(group.category)}
                        className="text-2xl leading-none text-slate-300 transition hover:text-white"
                        aria-label="Tilføj udgift i kategori"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {!isCollapsed ? (
                    <ul className="border-t border-white/10">
                      {group.items.map((item) => (
                        <li
                          key={item.id}
                          className="border-b border-white/10 px-4 py-4 last:border-b-0 sm:px-6 sm:py-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-xl font-semibold text-slate-100">{item.name}</p>
                              <p className="mt-0.5 text-lg text-slate-400 sm:text-xl">
                                {periodLabelToFrequencyText(item.periodLabel)}
                              </p>

                              <div className="mt-2 flex items-center gap-3 text-sm">
                                <button type="button" className="text-slate-400 transition hover:text-slate-200">
                                  Rediger
                                </button>
                                <button type="button" className="text-rose-400 transition hover:text-rose-300">
                                  Slet
                                </button>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-2xl font-semibold text-slate-100 sm:text-4xl">
                                {formatCompactDkk(item.amountMonthly)}
                              </p>
                              {typeof item.amountPeriod === "number" && item.periodLabel ? (
                                <p className="mt-1 text-sm text-slate-500">
                                  {formatCompactDkk(item.amountPeriod)}/{item.periodLabel}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          {isLoadingExpenses ? (
            <p className="mt-4 text-sm text-slate-400">Opdaterer udgifter...</p>
          ) : null}

          {dataSource === "fallback" ? (
            <p className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm text-blue-100">
              Viser demo-tal. Opret data i tabellen expense_items for at få live-udgifter.
            </p>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">{email ?? ""}</p>
        </section>

        <BottomNav activeItem="Udgifter" />
      </div>

      {isAddExpenseOpen ? (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" onClick={closeAddExpenseModal}>
          <section
            className="absolute bottom-20 left-1/2 w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 rounded-[2rem] border border-white/10 bg-slate-800 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)] sm:p-7"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tilføj udgift"
          >
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-3xl font-semibold text-white">Tilføj udgift</h2>
              <button
                type="button"
                onClick={closeAddExpenseModal}
                className="text-4xl leading-none text-slate-400 transition hover:text-white"
                aria-label="Luk"
              >
                ×
              </button>
            </header>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xl font-medium text-slate-200">Navn</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="f.eks. Huslån"
                  className="h-16 w-full rounded-2xl border border-white/10 bg-slate-600/65 px-5 text-2xl text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xl font-medium text-slate-200">Kategori</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/15 bg-slate-600/70 px-4 text-xl text-white focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20"
                >
                  {Array.from(new Set([...CATEGORIES, ...groupedExpenses.map((group) => group.category)])).map(
                    (option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xl font-medium text-slate-200">Beløb</span>
                <div className="relative">
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-16 w-full rounded-2xl border border-white/10 bg-slate-600/65 px-5 pr-16 text-2xl text-white placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20"
                  />
                  <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xl text-slate-300">
                    kr
                  </span>
                </div>
              </label>

              <fieldset>
                <legend className="mb-3 text-xl font-medium text-slate-200">Frekvens</legend>
                <div className="grid grid-cols-2 gap-3">
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
                        className={`h-16 rounded-2xl border text-xl font-medium transition ${
                          isActive
                            ? "border-blue-400 bg-blue-500/20 text-blue-300"
                            : "border-white/15 bg-slate-700/40 text-slate-300 hover:border-white/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => setIsAdvancedOpen((value) => !value)}
                className="inline-flex items-center gap-2 text-slate-300 transition hover:text-white"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 transition ${isAdvancedOpen ? "rotate-90" : "rotate-0"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
                Avanceret
              </button>

              {isAdvancedOpen ? (
                <div className="rounded-2xl border border-white/10 bg-slate-700/35 px-4 py-3 text-sm text-slate-300">
                  Beløbet bliver automatisk omregnet til månedlig værdi.
                </div>
              ) : null}

              {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={isSavingExpense}
                className="mt-2 flex h-16 w-full items-center justify-center rounded-2xl bg-blue-500 text-2xl font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingExpense ? "Gemmer..." : "✓ Tilføj"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}