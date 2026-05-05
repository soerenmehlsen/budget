"use client";

import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteIcon } from "@/components/ui/delete";
import { SquarePenIcon } from "@/components/ui/square-pen";
import type { IncomeItem } from "@/types/budget";
import { formatCompactDkk, periodLabelToFrequencyText } from "@/lib/budget-format";

type Props = {
  item: IncomeItem;
  onEdit: (item: IncomeItem) => void;
  onDelete: (id: string) => void;
};

export function IncomeCard({ item, onEdit, onDelete }: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/70">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Navn</p>
          <div className="flex items-center gap-3">
            <AnimatedIconButton
              type="button"
              onClick={() => onEdit(item)}
              Icon={SquarePenIcon}
              iconSize={16}
              className="inline-flex text-sm items-center gap-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              aria-label="Rediger indkomst"
            >
              Rediger
            </AnimatedIconButton>
            <AnimatedIconButton
              type="button"
              onClick={() => onDelete(item.id)}
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
    </article>
  );
}
