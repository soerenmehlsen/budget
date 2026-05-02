"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Transition } from "motion/react";
import { motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutIcon, type LogoutIconHandle } from "@/components/ui/logout";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { WalletIcon } from "@/components/ui/wallet";
import { CACHE_KEYS, readCachedData, writeCachedData } from "@/lib/data-cache";
import { supabase } from "@/lib/supabase/client";

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
};

type DashboardData = {
  profileName?: string | null;
  incomeSources: IncomeSource[];
  expenseItems: ExpenseItem[];
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
};

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("da-DK", {
  maximumFractionDigits: 0,
});

function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

function bySortOrderAndName(a: ExpenseItem, b: ExpenseItem) {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.name.localeCompare(b.name, "da-DK");
}

async function fetchDashboardData(userId: string): Promise<{
  data: DashboardData;
  source: "supabase" | "fallback";
}> {
  const [profileResult, incomeResult, expenseResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("income_sources")
      .select("name, amount_monthly")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("expense_items")
      .select("id, category, name, amount_monthly, amount_annual, sort_order")
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
          }))
          .sort(bySortOrderAndName);

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
    },
    source: hasSupabaseData ? "supabase" : "fallback",
  };
}

export function DashboardClient() {
  const router = useRouter();
  const logoutIconRef = useRef<LogoutIconHandle>(null);
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
        setIsLoadingDashboard(false);
        return;
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
  const hasPositiveFreeToSpend = freeToSpend >= 0;

  const expenseSharePercent =
    totalIncome > 0 ? Math.min(100, Math.max(0, (totalExpenses / totalIncome) * 100)) : 0;
  const incomeSharePercent = totalIncome > 0 ? 100 : 0;
  const incomeSourceCount = dashboardData?.incomeSources.length ?? 0;
  const expenseItemCount = dashboardData?.expenseItems.length ?? 0;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.9)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-6 sm:pt-8">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
          <header className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="pl-1 sm:pl-0">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Budget</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                {"Overblik"}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-2xl bg-slate-200 p-0.5 dark:bg-slate-700/70">
                <button
                  type="button"
                  onClick={() => setPeriodView("month")}
                  className={`h-8 min-w-16 rounded-xl px-2 text-xs font-semibold transition sm:h-10 sm:min-w-0 sm:px-4 sm:text-lg ${
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
                  className={`h-8 min-w-16 rounded-xl px-2 text-xs font-semibold transition sm:h-10 sm:min-w-0 sm:px-4 sm:text-lg ${
                    periodView === "year"
                      ? "bg-white text-slate-900 dark:bg-slate-600 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  }`}
                >
                  År
                </button>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                onMouseEnter={() => logoutIconRef.current?.startAnimation()}
                onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-300 bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:border-white/15 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-400/20 sm:h-11 sm:w-11 sm:rounded-2xl"
                aria-label="Log ud"
              >
                <LogoutIcon ref={logoutIconRef} size={20} />
              </button>
            </div>
          </header>

          {dataSource === "fallback" ? (
            <p className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              Viser demo-tal. Tilføj data i tabellerne <span className="font-semibold">income_sources</span> og <span className="font-semibold">expense_items</span> for at få live-overblik.
            </p>
          ) : null}

          <section className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
            <article className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-[0_18px_45px_rgba(16,185,129,0.12)] dark:border-emerald-400/20 dark:bg-emerald-400/10 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300 sm:text-sm">Indkomst</p>
                  <p className="mt-1 text-[11px] font-medium text-emerald-700/75 dark:text-emerald-100/75 sm:text-sm">
                    {incomeSourceCount} {incomeSourceCount === 1 ? "kilde" : "kilder"}
                  </p>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-[0_12px_28px_rgba(16,185,129,0.3)] sm:h-12 sm:w-12 sm:rounded-2xl">
                  <TrendingUpIcon aria-hidden="true" size={20} />
                </div>
              </div>

              <p className="mt-4 break-words text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {formatMoney(totalIncome)}
              </p>

              <div className="mt-4">
                <progress
                  aria-label="Indkomstniveau"
                  className="h-2 w-full overflow-hidden rounded-full bg-white accent-emerald-500 [&::-moz-progress-bar]:bg-emerald-500 [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-emerald-500"
                  max={100}
                  value={incomeSharePercent}
                />
                <p className="mt-2 text-[11px] font-medium text-emerald-800 dark:text-emerald-100 sm:text-xs">
                  Samlet {periodView === "month" ? "månedlig" : "årlig"} indkomst
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/70 p-3 shadow-[0_18px_45px_rgba(244,63,94,0.1)] dark:border-rose-400/20 dark:bg-rose-400/10 sm:rounded-3xl sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300 sm:text-sm">Udgifter</p>
                  <p className="mt-1 text-[11px] font-medium text-rose-700/75 dark:text-rose-100/75 sm:text-sm">
                    {expenseItemCount} faste udgifter
                  </p>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-[0_12px_28px_rgba(244,63,94,0.28)] sm:h-12 sm:w-12 sm:rounded-2xl">
                  <WalletIcon aria-hidden="true" size={20} />
                </div>
              </div>

              <p className="mt-4 break-words text-lg font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {formatMoney(totalExpenses)}
              </p>

              <div className="mt-4">
                <progress
                  aria-label="Udgifters andel af indkomst"
                  className="h-2 w-full overflow-hidden rounded-full bg-white accent-rose-500 [&::-moz-progress-bar]:bg-rose-500 [&::-webkit-progress-bar]:bg-white [&::-webkit-progress-value]:bg-rose-500"
                  max={100}
                  value={expenseSharePercent}
                />
                <p className="mt-2 text-[11px] font-medium text-rose-800 dark:text-rose-100 sm:text-xs">
                  {percentFormatter.format(expenseSharePercent)}% af indkomst
                </p>
              </div>
            </article>
          </section>

          <section
            className={`mt-4 rounded-2xl p-4 text-white sm:mt-5 sm:rounded-[1.75rem] sm:p-6 ${
              hasPositiveFreeToSpend
                ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-500 shadow-[0_22px_70px_rgba(16,185,129,0.32)]"
                : "bg-gradient-to-br from-rose-400 via-rose-500 to-red-500 shadow-[0_22px_70px_rgba(244,63,94,0.26)]"
            }`}
          >
            <p className="text-lg font-medium sm:text-4xl">
              Rådighedsbeløb {periodView === "month" ? "pr. måned" : "pr. år"}
            </p>
            <p className="mt-2 break-words text-3xl font-semibold sm:mt-3 sm:text-6xl">
              {formatMoney(freeToSpend)}
            </p>
            <p className="mt-2 text-xs font-medium text-white/90 sm:mt-3 sm:text-3xl">
              {percentFormatter.format(freeToSpendPercent)}% af indkomst
            </p>
          </section>

          <section className="mt-6 sm:mt-7">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
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
                  className="h-8 rounded-lg border border-slate-300 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-700 dark:text-slate-100 px-2 text-xs font-medium outline-none transition focus:border-blue-300 dark:focus:border-blue-300 focus:ring-4 focus:ring-blue-400/15 sm:h-11 sm:rounded-xl sm:px-4 sm:text-lg"
                >
                  <option value="alpha">A-Å</option>
                  <option value="highest">Størst først</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsCollapsed((value) => !value)}
                  className="h-8 rounded-lg border border-slate-300 bg-slate-100 px-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 transition dark:hover:bg-slate-700 hover:bg-slate-200 sm:h-11 sm:rounded-xl sm:px-4 sm:text-lg"
                >
                  {isCollapsed ? "Fold ud" : "Fold ind"}
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
              {groupedExpenses.map((group) => (
                <motion.article
                  key={group.category}
                  layout
                  transition={collapseTransition}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-slate-800/75 sm:rounded-3xl"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white sm:text-4xl">{group.category}</h3>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-3xl">
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
                        className="border-t border-slate-200 px-3 py-2 dark:border-white/10 sm:px-6 sm:py-4"
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
                            className="flex items-baseline justify-between gap-2 py-1 text-xs sm:gap-3 sm:py-1.5 sm:text-xl"
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
              ))}
            </div>
          </section>

          {isLoadingDashboard ? (
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-400 sm:mt-5 sm:text-sm">Opdaterer budgetdata...</p>
          ) : null}
        </section>

        <BottomNav />
      </div>
    </main>
  );
}
