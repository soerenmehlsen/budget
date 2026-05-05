"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { IncomeFormValues } from "@/hooks/useIncome";
import type { IncomeItem, Frequency } from "@/types/budget";
import {
  frequencyToPeriodLabel,
  frequencyToMonthlyAmount,
  periodLabelToFrequency,
} from "@/lib/budget-format";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Månedlig" },
  { value: "quarterly", label: "Kvartalsvis" },
  { value: "halfYearly", label: "Halvårlig" },
  { value: "yearly", label: "Årlig" },
];

type Props = {
  editingItem: IncomeItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: IncomeFormValues) => Promise<void>;
};

export function IncomeFormModal({ editingItem, isSaving, onClose, onSave }: Props) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [amount, setAmount] = useState(
    editingItem ? String(editingItem.amountPeriod ?? editingItem.amountMonthly) : "",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    periodLabelToFrequency(editingItem?.periodLabel),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = editingItem !== null;

  const parsedAmount = Number(amount.replace(",", "."));
  const isFormValid =
    name.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    frequency !== undefined;

  const handleSubmit = async () => {
    const parsedAmount = Number(amount.replace(",", "."));
    if (!name.trim()) { setFormError("Navn er påkrævet."); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError("Beløb skal være større end 0."); return; }

    setFormError(null);
    try {
      await onSave({
        name: name.trim(),
        amountMonthly: frequencyToMonthlyAmount(parsedAmount, frequency),
        amountPeriod: frequency === "monthly" ? null : parsedAmount,
        periodLabel: frequency === "monthly" ? null : frequencyToPeriodLabel(frequency),
      });
    } catch {
      setFormError(
        isEditing
          ? "Kunne ikke opdatere indkomst. Prøv igen."
          : "Kunne ikke gemme indkomst. Tjek at tabellen income_sources findes.",
      );
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      onClick={onClose}
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
          aria-label={isEditing ? "Rediger indkomst" : "Tilføj indkomst"}
        >
          <header className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
              {isEditing ? "Rediger indkomst" : "Tilføj indkomst"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-xl leading-none text-slate-400 transition hover:text-slate-900 dark:hover:text-white sm:text-2xl"
              aria-label="Luk"
            >
              ×
            </button>
          </header>

          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3 lg:space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Indkomstkilde <span className="text-rose-500">*</span></span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="f.eks. Løn"
                className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-lg"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Beløb <span className="text-rose-500">*</span></span>
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
              <legend className="mb-2 text-base font-medium text-slate-900 dark:text-slate-200 sm:text-base">Frekvens <span className="text-rose-500">*</span></legend>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFrequency(option.value)}
                    className={`h-10 rounded-2xl border text-sm font-medium transition sm:h-12 sm:text-base ${
                      frequency === option.value
                        ? "border-blue-400 bg-blue-500/20 text-blue-700 dark:text-blue-300"
                        : "border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-400 dark:border-white/15 dark:bg-slate-700/40 dark:text-slate-300 dark:hover:border-white/25"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {formError ? <p className="text-xs text-rose-600 dark:text-rose-300 sm:text-sm">{formError}</p> : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !isFormValid}
              className="mt-1 flex h-10 w-full items-center justify-center rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-2 sm:h-12 sm:text-lg"
            >
              {isSaving ? "Gemmer..." : isEditing ? "Gem ændringer" : "Gem"}
            </button>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
