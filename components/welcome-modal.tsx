"use client";

import Link from "next/link";
import { TrendingUp, WalletMinimal, Building2, LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  onClose: () => void;
};

const STEPS = [
  {
    icon: TrendingUp,
    title: "Tilføj din indkomst",
    description: "Tilføj din månedlige løn og andre faste indtægter.",
    color: "emerald",
  },
  {
    icon: WalletMinimal,
    title: "Tilføj dine udgifter",
    description: "Registrér dine faste udgifter fordelt på kategorier.",
    color: "rose",
  },
  {
    icon: Building2,
    title: "Tilføj dine bankkonti",
    description: "Opret dine bankkonti og knyt udgifter til dem, så beregner appen automatisk, hvad du skal overføre til hver konto.",
    color: "violet",
  },
  {
    icon: LayoutDashboard,
    title: "Se dit overblik",
    description: "Dashboardet beregner automatisk dit rådighedsbeløb.",
    color: "blue",
  },
] as const;

const colorMap = {
  emerald: {
    icon: "bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
    border: "border-emerald-200 dark:border-emerald-400/20",
    bg: "bg-emerald-50/60 dark:bg-emerald-400/10",
  },
  rose: {
    icon: "bg-rose-500 shadow-[0_8px_20px_rgba(244,63,94,0.28)]",
    border: "border-rose-200 dark:border-rose-400/20",
    bg: "bg-rose-50/60 dark:bg-rose-400/10",
  },
  violet: {
    icon: "bg-violet-500 shadow-[0_8px_20px_rgba(139,92,246,0.28)]",
    border: "border-violet-200 dark:border-violet-400/20",
    bg: "bg-violet-50/60 dark:bg-violet-400/10",
  },
  blue: {
    icon: "bg-blue-500 shadow-[0_8px_20px_rgba(59,130,246,0.28)]",
    border: "border-blue-200 dark:border-blue-400/20",
    bg: "bg-blue-50/60 dark:bg-blue-400/10",
  },
};

export function WelcomeModal({ onClose }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClose}
    >
      <div className="absolute left-1/2 top-1/2 w-[calc(100%-1rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
        <motion.section
          className="overflow-auto rounded-[1rem] border border-slate-200 bg-white p-5 shadow-[0_25px_80px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-slate-800 dark:shadow-[0_25px_80px_rgba(0,0,0,0.5)] sm:rounded-[1.5rem] sm:p-6"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Velkommen — kom i gang"
        >
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
            Velkommen til Mit Budget
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kom i gang på 4 enkle trin.
          </p>

          <ol className="mt-5 space-y-3">
            {STEPS.map((step, index) => {
              const colors = colorMap[step.color];
              const Icon = step.icon;
              return (
                <li
                  key={step.title}
                  className={`flex items-start gap-3 rounded-2xl border p-3 sm:p-4 ${colors.border} ${colors.bg}`}
                >
                  <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white ${colors.icon}`}>
                    <Icon aria-hidden="true" size={16} strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Trin {index + 1}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="order-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 sm:order-1"
            >
              Spring over
            </button>
            <Link
              href="/income"
              onClick={onClose}
              className="order-1 rounded-xl bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition hover:bg-blue-500 sm:order-2"
            >
              Kom i gang
            </Link>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
