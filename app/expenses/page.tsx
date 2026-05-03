"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { ChevronRightIcon } from "@/components/ui/chevron-right";
import { DeleteIcon } from "@/components/ui/delete";
import { PlusIcon } from "@/components/ui/plus";
import { SquarePenIcon } from "@/components/ui/square-pen";
import {
  CACHE_KEYS,
  invalidateDashboardCache,
  readCachedData,
  writeCachedData,
} from "@/lib/data-cache";
import { supabase } from "@/lib/supabase/client";

type Frequency = "monthly" | "quarterly" | "halfYearly" | "yearly";

type BankAccount = {
  id: string;
  name: string;
  sortOrder?: number | null;
};

type ExpenseItem = {
  id: string;
  category: string;
  name: string;
  amountMonthly: number;
  amountPeriod?: number | null;
  periodLabel?: string | null;
  sortOrder?: number | null;
  bankAccountId?: string | null;
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
  "Mad",
  "Forbrug",
  "Transport",
  "Abonnementer",
  "Forsikring",
  "Sundhed",
  "Børn",
  "Kæledyr",
  "Fritid",
  "Restaurant og cafe",
  "Tøj og sko",
  "Gaver",
  "Rejser",
  "Opsparing",
  "Gæld",
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

function expenseItemToFrequency(item: ExpenseItem): Frequency {
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

export default function ExpensesPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [bankAccountError, setBankAccountError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Abonnementer");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadExpenses = async (signedInUserId: string) => {
      const cached = readCachedData<ExpenseItem[]>(CACHE_KEYS.expenses, signedInUserId);

      if (cached) {
        setExpenseItems(cached.data);
        setDataSource(cached.source);
      }

      setIsLoadingExpenses(true);

      const { data, error } = await supabase
        .from("expense_items")
        .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
        .eq("user_id", signedInUserId)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error || !data || data.length === 0) {
        setExpenseItems(FALLBACK_EXPENSES);
        setDataSource("fallback");
        if (!error) {
          writeCachedData(CACHE_KEYS.expenses, signedInUserId, FALLBACK_EXPENSES, "fallback");
        }
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
          bankAccountId: typeof row.bank_account_id === "string" ? row.bank_account_id : null,
        }))
        .sort(bySortOrderAndName);

      setExpenseItems(mapped);
      setDataSource("supabase");
      writeCachedData(CACHE_KEYS.expenses, signedInUserId, mapped, "supabase");
      setIsLoadingExpenses(false);
    };

    const loadBankAccounts = async (signedInUserId: string) => {
      setIsLoadingAccounts(true);
      setBankAccountError(null);

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, sort_order")
        .eq("user_id", signedInUserId)
        .order("sort_order", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setBankAccountError("Kunne ikke hente bankkonti. Tjek at tabellen bank_accounts findes.");
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
        .sort((a, b) => {
          const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          return a.name.localeCompare(b.name, "da-DK");
        });

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
      await Promise.all([
        loadExpenses(data.session.user.id),
        loadBankAccounts(data.session.user.id),
      ]);
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
        void Promise.all([
          loadExpenses(session.user.id),
          loadBankAccounts(session.user.id),
        ]);
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

  const bankAccountLookup = useMemo(() => {
    const lookup = new Map<string, string>();

    for (const account of bankAccounts) {
      lookup.set(account.id, account.name);
    }

    return lookup;
  }, [bankAccounts]);

  const isAllCollapsed =
    groupedExpenses.length > 0 &&
    groupedExpenses.every((group) => collapsedCategories[group.category] === true);

  const resetAddExpenseForm = () => {
    setEditingExpenseId(null);
    setName("");
    setCategory("Abonnementer");
    setAmount("");
    setFrequency("monthly");
    setBankAccountId("");
    setIsAdvancedOpen(false);
    setFormError(null);
  };

  const openAddExpenseModal = (preferredCategory?: string) => {
    resetAddExpenseForm();

    if (preferredCategory) {
      setCategory(preferredCategory);
    }

    setIsAddExpenseOpen(true);
    setFormError(null);
  };

  const openEditExpenseModal = (item: ExpenseItem) => {
    setEditingExpenseId(item.id);
    setName(item.name);
    setCategory(item.category);
    setAmount(String(item.amountPeriod ?? item.amountMonthly));
    setFrequency(expenseItemToFrequency(item));
    setBankAccountId(item.bankAccountId ?? "");
    setIsAdvancedOpen(false);
    setFormError(null);
    setIsAddExpenseOpen(true);
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
    const isEditingExpense = editingExpenseId !== null;

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

    const groupItems = expenseItems.filter(
      (item) => item.category === category && item.id !== editingExpenseId,
    );
    const nextSortOrder = groupItems.length + 1;

    const payload = {
      user_id: userId,
      category,
      name: name.trim(),
      amount_monthly: monthlyAmount,
      amount_annual: periodAmount,
      sort_order: nextSortOrder,
      bank_account_id: bankAccountId || null,
    };

    const { data, error } = isEditingExpense
      ? await supabase
          .from("expense_items")
          .update(payload)
          .eq("id", editingExpenseId)
          .eq("user_id", userId)
            .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
          .single()
      : await supabase
          .from("expense_items")
          .insert(payload)
            .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
          .single();

    if (error) {
      setIsSavingExpense(false);
      setFormError(
        isEditingExpense
          ? "Kunne ikke opdatere udgift. Tjek at tabellen expense_items findes."
          : "Kunne ikke gemme udgift. Tjek at tabellen expense_items findes.",
      );
      return;
    }

    const savedItem: ExpenseItem = {
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
      bankAccountId:
        typeof data.bank_account_id === "string"
          ? data.bank_account_id
          : bankAccountId || null,
    };

    const nextExpenseItems = (
      isEditingExpense
        ? expenseItems.map((item) => (item.id === editingExpenseId ? savedItem : item))
        : [...expenseItems, savedItem]
    ).sort(bySortOrderAndName);

    setExpenseItems(nextExpenseItems);
    writeCachedData(CACHE_KEYS.expenses, userId, nextExpenseItems, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");
    setIsSavingExpense(false);
    closeAddExpenseModal();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!userId) {
      setFormError("Kunne ikke finde bruger. Prøv igen.");
      return;
    }

    const isConfirmed = window.confirm("Vil du slette denne udgift?");

    if (!isConfirmed) {
      return;
    }

    const { error } = await supabase
      .from("expense_items")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", userId);

    if (error) {
      setFormError("Kunne ikke slette udgift. Prøv igen.");
      return;
    }

    const nextExpenseItems = expenseItems.filter((item) => item.id !== expenseId);
    setExpenseItems(nextExpenseItems);
    writeCachedData(CACHE_KEYS.expenses, userId, nextExpenseItems, "supabase");
    invalidateDashboardCache(userId);
    setDataSource("supabase");

    if (editingExpenseId === expenseId) {
      closeAddExpenseModal();
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
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Udgifter</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">{totalCount} faste udgifter</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <AnimatedIconButton
                type="button"
                onClick={() => openAddExpenseModal()}
                Icon={PlusIcon}
                iconSize={20}
                className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/30 bg-blue-500 text-white shadow-[0_15px_45px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-300/35"
                aria-label="Tilføj udgift"
              />
            </div>
          </header>

          {dataSource === "fallback" ? (
            <p className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100">
              Viser test data. Tilføj selv dine <span className="font-semibold">udgifter</span> for at få overblik over dine egne udgifter.
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between sm:mt-6">
            <AnimatedIconButton
              type="button"
              onClick={toggleAll}
              Icon={ChevronDownIcon}
              iconSize={16}
              iconClassName={`transition ${isAllCollapsed ? "rotate-0" : "rotate-180"}`}
              className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isAllCollapsed ? "Fold alle ud" : "Fold alle ind"}
            </AnimatedIconButton>

            <p className="text-sm text-slate-700 dark:text-slate-300">{formatCompactDkk(totalExpensesMonthly)}/md</p>
          </div>

          <div className="mt-4 space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
            {groupedExpenses.map((group) => {
              const isCollapsed = collapsedCategories[group.category] === true;

              return (
                <motion.article
                  key={group.category}
                  layout
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <AnimatedIconButton
                      type="button"
                      className="flex min-w-0 items-center gap-3"
                      onClick={() =>
                        setCollapsedCategories((current) => ({
                          ...current,
                          [group.category]: !isCollapsed,
                        }))
                      }
                      aria-label={`Skift visning for ${group.category}`}
                      Icon={ChevronDownIcon}
                      iconSize={20}
                      iconClassName={`text-slate-500 transition dark:text-slate-400 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                    >
                      <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white sm:text-base">{group.category}</h2>

                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {group.items.length}
                      </span>
                    </AnimatedIconButton>

                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                        {formatCompactDkk(group.totalMonthly)}/md
                      </p>

                      <AnimatedIconButton
                        type="button"
                        onClick={() => openAddExpenseModal(group.category)}
                        Icon={PlusIcon}
                        iconSize={20}
                        className="text-2xl leading-none text-slate-500 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Tilføj udgift i kategori"
                      />
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {!isCollapsed ? (
                      <motion.ul
                        className="overflow-hidden border-t border-slate-200 dark:border-white/10"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                      >
                        {group.items.map((item) => (
                          <li
                            key={item.id}
                            className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-white/10"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                                  {periodLabelToFrequencyText(item.periodLabel)}
                                </p>
                                {item.bankAccountId ? (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                                    Konto: {bankAccountLookup.get(item.bankAccountId) ?? "Ukendt konto"}
                                  </p>
                                ) : null}

                                <div className="mt-2 flex items-center gap-3 text-xs">
                                  <AnimatedIconButton
                                    type="button"
                                    onClick={() => openEditExpenseModal(item)}
                                    Icon={SquarePenIcon}
                                    iconSize={14}
                                    className="inline-flex items-center gap-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                    aria-label="Rediger udgift"
                                  >
                                    Rediger
                                  </AnimatedIconButton>
                                  <AnimatedIconButton
                                    type="button"
                                    onClick={() => handleDeleteExpense(item.id)}
                                    Icon={DeleteIcon}
                                    iconSize={14}
                                    className="inline-flex items-center gap-1.5 text-rose-400 transition hover:text-rose-300"
                                    aria-label="Slet udgift"
                                  >
                                    Slet
                                  </AnimatedIconButton>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
                                  {formatCompactDkk(item.amountMonthly)}
                                </p>
                                {typeof item.amountPeriod === "number" && item.periodLabel ? (
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {formatCompactDkk(item.amountPeriod)}/{item.periodLabel}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        ))}
                      </motion.ul>
                    ) : null}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>

          {isLoadingExpenses ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Opdaterer udgifter...</p>
          ) : null}

        </section>

        <BottomNav activeItem="Udgifter" />
      </div>

      {isAddExpenseOpen ? (
        <motion.div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={closeAddExpenseModal}
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
              aria-label={editingExpenseId ? "Rediger udgift" : "Tilføj udgift"}
            >
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
                {editingExpenseId ? "Rediger udgift" : "Tilføj udgift"}
              </h2>
              <button
                type="button"
                onClick={closeAddExpenseModal}
                className="text-xl leading-none text-slate-400 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:text-2xl"
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
                  placeholder="f.eks. Huslån"
                  className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-lg"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Kategori</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/15 dark:bg-slate-600/70 dark:text-white sm:h-11 sm:text-base"
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

              {frequency !== "monthly" ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100 sm:text-sm">
                  <span className="font-semibold">Tip:</span> Beløbet bliver automatisk omregnet til månedlig værdi.
                </div>
              ) : null}

              <AnimatedIconButton
                type="button"
                onClick={() => setIsAdvancedOpen((value) => !value)}
                Icon={ChevronRightIcon}
                iconSize={18}
                iconClassName={`transition ${isAdvancedOpen ? "rotate-90" : "rotate-0"}`}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:gap-2 sm:text-base"
              >
                Avanceret
              </AnimatedIconButton>

              {isAdvancedOpen ? (
                <div className=" space-y-3 rounded-2xl py-3 text-xs text-slate-600 dark:text-slate-300 sm:py-4 sm:text-sm">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">
                      Bankkonto
                    </span>
                    <select
                      value={bankAccountId}
                      onChange={(event) => setBankAccountId(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/15 dark:bg-slate-600/70 dark:text-white sm:h-11 sm:text-base"
                    >
                      <option value="">Ingen konto</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {isLoadingAccounts ? (
                    <p>Henter bankkonti...</p>
                  ) : null}

                  {bankAccountError ? <p className="text-rose-500">{bankAccountError}</p> : null}

                  {!isLoadingAccounts && bankAccounts.length === 0 ? (
                    <p>
                      Ingen bankkonti endnu. <Link href="/account" className="font-semibold text-blue-600 hover:text-blue-500">Tilføj en konto</Link>.
                    </p>
                  ) : null}

                </div>
              ) : null}

              {formError ? <p className="text-xs text-rose-600 dark:text-rose-300 sm:text-sm">{formError}</p> : null}

              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={isSavingExpense}
                className="mt-1 flex h-10 w-full items-center justify-center rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-2 sm:h-12 sm:text-lg"
              >
                {isSavingExpense
                  ? "Gemmer..."
                  : editingExpenseId
                    ? "Gem ændringer"
                    : "Tilføj"}
              </button>
            </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </main>
  );
}
