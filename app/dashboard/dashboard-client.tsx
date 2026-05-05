"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Baby,
  Briefcase,
  Car,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gift,
  HeartPulse,
  Home,
  PawPrint,
  PiggyBank,
  Plane,
  Plug,
  Shirt,
  ShoppingCart,
  Utensils,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Transition } from "motion/react";
import { animate, motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { WalletIcon } from "@/components/ui/wallet";
import { CACHE_KEYS, readCachedData, writeCachedData } from "@/lib/data-cache";
import { supabase } from "@/lib/supabase/client";
import { MONEY_FORMATTER } from "@/lib/budget-format";
import type { BankAccount } from "@/types/budget";

type PeriodView = "month" | "year";
type SortMode = "alpha" | "highest";

const collapseTransition: Transition = {
  duration: 0.22,
  ease: "easeOut",
};

type IncomeSource = {
  name: string;
  amountMonthly: number;
};

type ExpenseItem = {
  id: string;
  category: string;
  name: string;
  amountMonthly: number;
  amountAnnual?: number | null;
  sortOrder?: number | null;
  bankAccountId?: string | null;
};

type DashboardData = {
  profileName?: string | null;
  incomeSources: IncomeSource[];
  expenseItems: ExpenseItem[];
  bankAccounts: BankAccount[];
};

const FALLBACK_DASHBOARD_DATA: DashboardData = {
  incomeSources: [{ name: "Løn", amountMonthly: 55000 }],
  expenseItems: [
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
      amountAnnual: 18000,
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
      amountAnnual: 2400,
      sortOrder: 3,
    },
    {
      id: "utility-internet",
      category: "Forbrug",
      name: "Internet",
      amountMonthly: 299,
      sortOrder: 4,
    },
    {
      id: "transport-car-loan",
      category: "Transport",
      name: "Bil - lån",
      amountMonthly: 2500,
      sortOrder: 1,
    },
    {
      id: "transport-fuel",
      category: "Transport",
      name: "Benzin",
      amountMonthly: 1500,
      sortOrder: 2,
    },
    {
      id: "transport-insurance",
      category: "Transport",
      name: "Forsikring",
      amountMonthly: 1550,
      sortOrder: 3,
    },
  ],
  bankAccounts: [],
};

const PERCENT_FORMATTER = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
});

function formatMoney(amount: number) {
  return MONEY_FORMATTER.format(amount);
}

function useCountUp(target: number, duration = 1.3) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    const controls = animate(from, target, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, duration]);

  return value;
}

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.name.localeCompare(b.name, "da-DK");
}

const categoryIcons: Record<string, LucideIcon> = {
  Abonnementer: CreditCard,
  Bolig: Home,
  Børn: Baby,
  Diverse: Briefcase,
  Forbrug: Plug,
  Forsikring: WalletMinimal,
  Fritid: ShoppingCart,
  Gaver: Gift,
  Gæld: WalletMinimal,
  Kæledyr: PawPrint,
  Mad: Utensils,
  Opsparing: PiggyBank,
  Rejser: Plane,
  "Restaurant og cafe": Utensils,
  Sundhed: HeartPulse,
  Transport: Car,
  "Tøj og sko": Shirt,
};

async function fetchDashboardData(userId: string): Promise<{
  data: DashboardData;
  source: "supabase" | "fallback";
}> {
  const [profileResult, incomeResult, expenseResult, bankAccountResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("income_sources")
      .select("name, amount_monthly")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("expense_items")
      .select("id, category, name, amount_monthly, amount_annual, sort_order, bank_account_id")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("bank_accounts")
      .select("id, name, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  const profileName = profileResult.error
    ? null
    : (profileResult.data?.display_name ?? null);

  const incomeSources =
    incomeResult.error || !incomeResult.data || incomeResult.data.length === 0
      ? FALLBACK_DASHBOARD_DATA.incomeSources
      : incomeResult.data
          .filter((row) => typeof row.amount_monthly === "number")
          .map((row) => ({
            name: row.name || "Indkomst",
            amountMonthly: row.amount_monthly,
          }));

  const expenseItems =
    expenseResult.error || !expenseResult.data || expenseResult.data.length === 0
      ? FALLBACK_DASHBOARD_DATA.expenseItems
      : expenseResult.data
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
            amountAnnual:
              typeof row.amount_annual === "number" ? row.amount_annual : null,
            sortOrder: typeof row.sort_order === "number" ? row.sort_order : null,
            bankAccountId:
              typeof row.bank_account_id === "string" ? row.bank_account_id : null,
          }))
          .sort(bySortOrderAndName);

  const bankAccounts =
    bankAccountResult.error || !bankAccountResult.data
      ? []
      : bankAccountResult.data
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

  const hasSupabaseData =
    !incomeResult.error &&
    !expenseResult.error &&
    incomeResult.data !== null &&
    expenseResult.data !== null &&
    (incomeResult.data.length > 0 || expenseResult.data.length > 0);

  return {
    data: {
      profileName,
      incomeSources,
      expenseItems,
      bankAccounts,
    },
    source: hasSupabaseData ? "supabase" : "fallback",
  };
}

export function DashboardClient() {
  const router = useRouter();
const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [periodView, setPeriodView] = useState<PeriodView>("month");
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async (userId: string) => {
      const cached = readCachedData<DashboardData>(CACHE_KEYS.dashboard, userId);

      if (cached) {
        setDashboardData(cached.data);
        setDataSource(cached.source);
      }

      setIsLoadingDashboard(true);

      const { data, source } = await fetchDashboardData(userId);

      if (!isMounted) {
        return;
      }

      setDashboardData(data);
      setDataSource(source);
      writeCachedData(CACHE_KEYS.dashboard, userId, data, source);
      setIsLoadingDashboard(false);
    };

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!data.session) {
        setIsLoadingDashboard(false);
        router.replace("/");
        return;
      }

      await loadDashboardData(data.session.user.id);
      setIsCheckingSession(false);
    };

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setIsLoadingDashboard(false);
          router.replace("/");
          return;
        }

        void loadDashboardData(session.user.id);
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

    for (const item of dashboardData?.expenseItems ?? []) {
      const bucket = grouped.get(item.category) ?? [];
      bucket.push(item);
      grouped.set(item.category, bucket);
    }

    return Array.from(grouped.entries())
      .map(([category, items]) => ({
        category,
        items: [...items].sort(bySortOrderAndName),
        totalMonthly: items.reduce((total, item) => total + item.amountMonthly, 0),
      }))
      .sort((a, b) => {
        if (sortMode === "highest") {
          return b.totalMonthly - a.totalMonthly;
        }

        return a.category.localeCompare(b.category, "da-DK");
      });
  }, [dashboardData?.expenseItems, sortMode]);

  const transferTargets = useMemo(() => {
    const expenses = dashboardData?.expenseItems ?? [];
    const accounts = dashboardData?.bankAccounts ?? [];
    const totals = new Map<string, number>();

    for (const item of expenses) {
      if (!item.bankAccountId) {
        continue;
      }

      totals.set(
        item.bankAccountId,
        (totals.get(item.bankAccountId) ?? 0) + item.amountMonthly,
      );
    }

    return accounts
      .map((account) => ({
        id: account.id,
        name: account.name,
        amountMonthly: totals.get(account.id) ?? 0,
      }))
      .filter((account) => account.amountMonthly > 0);
  }, [dashboardData?.bankAccounts, dashboardData?.expenseItems]);

  const periodFactor = periodView === "year" ? 12 : 1;

  const totalIncome = useMemo(
    () =>
      (dashboardData?.incomeSources ?? []).reduce(
        (sum, source) => sum + source.amountMonthly,
        0,
      ) * periodFactor,
    [dashboardData?.incomeSources, periodFactor],
  );

  const totalExpenses = useMemo(
    () =>
      groupedExpenses.reduce((sum, group) => sum + group.totalMonthly, 0) * periodFactor,
    [groupedExpenses, periodFactor],
  );

  const freeToSpend = totalIncome - totalExpenses;

  const freeToSpendPercent =
    totalIncome > 0 ? Math.max(0, (freeToSpend / totalIncome) * 100) : 0;

  const expenseSharePercent =
    totalIncome > 0 ? Math.min(100, Math.max(0, (totalExpenses / totalIncome) * 100)) : 0;
  const incomeSharePercent = totalIncome > 0 ? 100 : 0;
  const incomeSourceCount = dashboardData?.incomeSources.length ?? 0;
  const expenseItemCount = dashboardData?.expenseItems.length ?? 0;

  const animatedIncome = useCountUp(totalIncome);
  const animatedExpenses = useCountUp(totalExpenses);
  const animatedFreeToSpend = useCountUp(freeToSpend);

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.9)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-center justify-between gap-2 sm:gap-4"
          >
            <div className="pl-1 sm:pl-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Oversigt</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-2xl bg-slate-200 p-0.5 dark:bg-slate-700/70">
                <button
                  type="button"
                  onClick={() => setPeriodView("month")}
                  className={`h-8 min-w-16 rounded-xl px-2 text-xs font-semibold transition sm:h-9 sm:min-w-0 sm:px-3 sm:text-sm ${
                    periodView === "month"
                      ? "bg-white text-slate-900 dark:bg-slate-600 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  Måned
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodView("year")}
                  className={`h-8 min-w-16 rounded-xl px-2 text-xs font-semibold transition sm:h-9 sm:min-w-0 sm:px-3 sm:text-sm ${
                    periodView === "year"
                      ? "bg-white text-slate-900 dark:bg-slate-600 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  År
                </button>
              </div>
            </div>
          </motion.header>

          {dataSource === "fallback" ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm"
            >
              Viser test data. Tilføj selv din <span className="font-semibold">indkomst</span> og <span className="font-semibold">udgifter</span> for at få overblik over din økonomi.
            </motion.p>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4"
          >
            <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-[0_18px_45px_rgba(16,185,129,0.12)] dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:p-4 lg:col-span-2 lg:rounded-2xl lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300 sm:text-sm">Indkomst</p>
                  <p className="mt-1 text-[11px] font-medium text-emerald-700/75 dark:text-emerald-100/75 sm:text-xs">
                    {incomeSourceCount} {incomeSourceCount === 1 ? "Indtægt" : "Indtægter"}
                  </p>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.3)] sm:h-10 sm:w-10">
                  <TrendingUpIcon aria-hidden="true" size={20} />
                </div>
              </div>

              <p className="mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                {formatMoney(animatedIncome)}
              </p>

              <div className="mt-4">
                <div
                  role="progressbar"
                  aria-label="Indkomstniveau"
                  aria-valuenow={incomeSharePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 w-full overflow-hidden rounded-full bg-white"
                >
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${incomeSharePercent}%` }}
                    transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.35 }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-100 sm:text-xs">
                  Samlet {periodView === "month" ? "månedlig" : "årlig"} indkomst
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/70 p-3 shadow-[0_18px_45px_rgba(244,63,94,0.1)] dark:border-rose-400/20 dark:bg-rose-400/10 sm:p-4 lg:col-span-2 lg:rounded-2xl lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300 sm:text-sm">Udgifter</p>
                  <p className="mt-1 text-[11px] font-medium text-rose-700/75 dark:text-rose-100/75 sm:text-xs">
                    {expenseItemCount} faste udgifter
                  </p>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-[0_12px_28px_rgba(244,63,94,0.28)] sm:h-10 sm:w-10">
                  <WalletIcon aria-hidden="true" size={20} />
                </div>
              </div>

              <p className="mt-3 break-words text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                {formatMoney(animatedExpenses)}
              </p>

              <div className="mt-4">
                <div
                  role="progressbar"
                  aria-label="Udgifters andel af indkomst"
                  aria-valuenow={expenseSharePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 w-full overflow-hidden rounded-full bg-white"
                >
                  <motion.div
                    className="h-full rounded-full bg-rose-500"
                    initial={{ width: "0%" }}
                    animate={{ width: `${expenseSharePercent}%` }}
                    transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.45 }}
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-rose-800 dark:text-rose-100 sm:text-xs">
                  {PERCENT_FORMATTER.format(expenseSharePercent)}% af indkomst
                </p>
              </div>
            </article>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.18 }}
            className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-[0_18px_45px_rgba(37,99,235,0.12)] dark:border-blue-400/20 dark:bg-blue-400/10 sm:mt-5 sm:rounded-[1.75rem] sm:p-5 lg:rounded-2xl"
          >
            <p className="text-lg font-medium text-blue-700 dark:text-blue-300 sm:text-2xl lg:text-lg">
              Rådighedsbeløb {periodView === "month" ? "pr. måned" : "pr. år"}
            </p>
            <p className="mt-2 break-words text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">
              {formatMoney(animatedFreeToSpend)}
            </p>
            <p className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-100 sm:text-base">
              {PERCENT_FORMATTER.format(freeToSpendPercent)}% af indkomst
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
            className="mt-6 sm:mt-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Udgifter pr. kategori
              </h2>

              <div className="flex items-center gap-2 sm:gap-3">
                <label className="sr-only" htmlFor="sort-expenses">
                  Sortering
                </label>
                <select
                  id="sort-expenses"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-400/15 dark:border-white/10 dark:bg-slate-700 dark:text-slate-100 dark:focus:border-blue-300 sm:h-10 sm:rounded-xl sm:px-3 sm:text-sm"
                >
                  <option value="alpha">A-Å</option>
                  <option value="highest">Størst først</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsCollapsed((value) => !value)}
                  aria-label={isCollapsed ? "Fold ud" : "Fold ind"}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10 sm:rounded-xl"
                >
                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
              {groupedExpenses.map((group) => {
                const CategoryIcon = categoryIcons[group.category];

                return (
                <motion.article
                  key={group.category}
                  layout
                  transition={collapseTransition}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-slate-800/75"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      {CategoryIcon ? (
                        <span className="grid h-7 w-7 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200">
                          <CategoryIcon aria-hidden="true" size={14} />
                        </span>
                      ) : null}
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white sm:text-lg lg:text-base">{group.category}</h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-base">
                      {formatMoney(group.totalMonthly * periodFactor)}/{periodView === "month" ? "md" : "år"}
                    </p>
                  </div>

                  <motion.div
                    className="grid overflow-hidden"
                    initial={false}
                    animate={{ gridTemplateRows: isCollapsed ? "0fr" : "1fr" }}
                    transition={collapseTransition}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <motion.ul
                        className="border-t border-slate-200 px-3 py-2 dark:border-white/10 sm:px-4 sm:py-3"
                        initial={false}
                        animate={{
                          opacity: isCollapsed ? 0 : 1,
                          y: isCollapsed ? -4 : 0,
                        }}
                        transition={collapseTransition}
                      >
                        {group.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-baseline justify-between gap-2 py-1 text-xs sm:gap-3 sm:text-sm"
                          >
                            <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                            <span className="text-slate-900 dark:text-slate-100">
                              {formatMoney(item.amountMonthly * periodFactor)}
                              {item.amountAnnual && periodView === "month"}
                            </span>
                          </li>
                        ))}
                      </motion.ul>
                    </div>
                  </motion.div>
                </motion.article>
              );
            })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.32 }}
            className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-800/80 dark:shadow-[0_28px_70px_rgba(2,6,23,0.45)] sm:mt-7 sm:rounded-[1.75rem] sm:p-5 lg:rounded-2xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200">
                  <ArrowLeftRight aria-hidden="true" size={18} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Fast overførsel
                  </p>
                  <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                    Forslag baseret på dine udgifter
                  </h2>
                </div>
              </div>
            </div>

            {transferTargets.length > 0 ? (
              <div className="mt-4 space-y-3">
                {transferTargets.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm shadow-[0_12px_26px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900/60"
                  >
                    <div className="min-w-0">
                      <p className="min-w-0 truncate font-semibold text-slate-900 dark:text-white">
                        {account.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Kontooverførsel
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
                      {formatMoney(account.amountMonthly * periodFactor)}/{periodView === "month" ? "md" : "år"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                Der er ingen udgifter knyttet til en bankkonto. Vælg en konto under
                avanceret på en <Link href="/expenses" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Udgift</Link>.
              </p>
            )}
          </motion.section>

          {isLoadingDashboard ? (
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-400 sm:mt-5 sm:text-sm">Opdaterer budgetdata...</p>
          ) : null}
        </section>

        <BottomNav />
      </div>
    </main>
  );
}
