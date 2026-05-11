"use client";

import { memo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { DeleteIcon } from "@/components/ui/delete";
import { PlusIcon } from "@/components/ui/plus";
import { SquarePenIcon } from "@/components/ui/square-pen";
import type { ExpenseItem } from "@/types/budget";
import type { GroupedExpense } from "@/hooks/useExpenses";
import { formatCompactDkk, periodLabelToFrequencyText } from "@/lib/budget-format";

type Props = {
  group: GroupedExpense;
  bankAccountLookup: Map<string, string>;
  isCollapsed: boolean;
  onToggle: () => void;
  onEdit: (item: ExpenseItem) => void;
  onDelete: (id: string) => void;
  onAdd: (category: string) => void;
};

export const ExpenseCategoryGroup = memo(function ExpenseCategoryGroup({ group, bankAccountLookup, isCollapsed, onToggle, onEdit, onDelete, onAdd }: Props) {
  return (
    <motion.article
      layout
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/70"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <AnimatedIconButton
          type="button"
          className="flex min-w-0 items-center gap-3"
          onClick={onToggle}
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
            onClick={() => onAdd(group.category)}
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
              <li key={item.id} className="border-b border-slate-200 px-4 py-3 last:border-b-0 dark:border-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                      {periodLabelToFrequencyText(item.periodLabel)}
                    </p>
                    {item.bankAccountId ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                        {bankAccountLookup.get(item.bankAccountId) ?? "Ukendt konto"}
                      </p>
                    ) : null}

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <AnimatedIconButton
                        type="button"
                        onClick={() => onEdit(item)}
                        Icon={SquarePenIcon}
                        iconSize={14}
                        className="inline-flex items-center gap-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Rediger udgift"
                      >
                        Rediger
                      </AnimatedIconButton>
                      <AnimatedIconButton
                        type="button"
                        onClick={() => onDelete(item.id)}
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
});
