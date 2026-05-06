"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { BankAccount, ExpenseItem, Frequency } from "@/types/budget";
import type { ExpenseFormValues } from "@/hooks/useExpenses";
import {
  frequencyToPeriodLabel,
  frequencyToMonthlyAmount,
  periodLabelToFrequency,
} from "@/lib/budget-format";

const CATEGORIES = [
  "Bolig", "Mad", "Forbrug", "Transport", "Abonnementer",
  "Forsikring", "Sundhed", "Børn", "Kæledyr", "Fritid",
  "Restaurant og cafe", "Personlig pleje", "Tøj og sko", "Gaver", "Rejser",
  "Opsparing", "Investering", "Gæld", "Diverse",
];

type CommonExpense = { name: string; category: string };

const COMMON_EXPENSES: CommonExpense[] = [
  { name: "Husleje", category: "Bolig" },
  { name: "Huslån", category: "Bolig" },
  { name: "El", category: "Forbrug" },
  { name: "Vand", category: "Forbrug" },
  { name: "Varme", category: "Forbrug" },
  { name: "Internet", category: "Abonnementer" },
  { name: "Mobilabonnement", category: "Abonnementer" },
  { name: "Netflix", category: "Abonnementer" },
  { name: "Spotify", category: "Abonnementer" },
  { name: "Disney+", category: "Abonnementer" },
  { name: "HBO Max", category: "Abonnementer" },
  { name: "Dagligvarer", category: "Mad" },
  { name: "Frokost", category: "Mad" },
  { name: "Takeaway", category: "Restaurant og cafe" },
  { name: "Bilforsikring", category: "Forsikring" },
  { name: "Indboforsikring", category: "Forsikring" },
  { name: "Ulykkeforsikring", category: "Forsikring" },
  { name: "Sundhedsforsikring", category: "Forsikring" },
  { name: "Rejseforsikring", category: "Forsikring" },
  { name: "Tandlæge", category: "Sundhed" },
  { name: "Fitness", category: "Sundhed" },
  { name: "Frisør", category: "Personlig pleje" },
  { name: "Benzin", category: "Transport" },
  { name: "Offentlig transport", category: "Transport" },
  { name: "Parkering", category: "Transport" },
  { name: "Grøn ejerafgift", category: "Transport" },
  { name: "A-kasse", category: "Forsikring" },
  { name: "Fagforening", category: "Diverse" },
  { name: "Opsparing", category: "Opsparing" },
  { name: "Daginstitution", category: "Børn" },

];

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Månedlig" },
  { value: "quarterly", label: "Kvartalsvis" },
  { value: "halfYearly", label: "Halvårlig" },
  { value: "yearly", label: "Årlig" },
];

type Props = {
  editingItem: ExpenseItem | null;
  preferredCategory: string;
  isSaving: boolean;
  bankAccounts: BankAccount[];
  isLoadingAccounts: boolean;
  bankAccountError: string | null;
  existingCategories: string[];
  onClose: () => void;
  onSave: (values: ExpenseFormValues) => Promise<void>;
};

export function ExpenseFormModal({
  editingItem,
  preferredCategory,
  isSaving,
  bankAccounts,
  isLoadingAccounts,
  bankAccountError,
  existingCategories,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(editingItem?.name ?? "");
  const [category, setCategory] = useState(editingItem?.category ?? preferredCategory);
  const [amount, setAmount] = useState(
    editingItem ? String(editingItem.amountPeriod ?? editingItem.amountMonthly) : "",
  );
  const [frequency, setFrequency] = useState<Frequency>(
    periodLabelToFrequency(editingItem?.periodLabel),
  );
  const [bankAccountId, setBankAccountId] = useState(editingItem?.bankAccountId ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const COLLAPSED_LIMIT = 12;

  const isEditing = editingItem !== null;
  const allCategories = Array.from(new Set([...CATEGORIES, ...existingCategories]));

  const parsedAmount = Number(amount.replace(",", "."));
  const isFormValid = name.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async () => {
    if (!name.trim()) { setFormError("Navn er påkrævet."); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError("Beløb skal være større end 0."); return; }

    setFormError(null);
    try {
      await onSave({
        category,
        name: name.trim(),
        amountMonthly: frequencyToMonthlyAmount(parsedAmount, frequency),
        amountPeriod: frequency === "monthly" ? null : parsedAmount,
        periodLabel: frequency === "monthly" ? null : frequencyToPeriodLabel(frequency),
        bankAccountId: bankAccountId || null,
      });
    } catch {
      setFormError(
        isEditing
          ? "Kunne ikke opdatere udgift. Tjek at tabellen expense_items findes."
          : "Kunne ikke gemme udgift. Tjek at tabellen expense_items findes.",
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
          aria-label={isEditing ? "Rediger udgift" : "Tilføj udgift"}
        >
          <header className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white sm:text-2xl">
              {isEditing ? "Rediger udgift" : "Tilføj udgift"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-xl leading-none text-slate-400 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:text-2xl"
              aria-label="Luk"
            >
              ×
            </button>
          </header>

          <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3 lg:space-y-4">
            {!isEditing ? (
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-200">Populære udgifter</span>

                {/* Mobil: fold-ud */}
                <div className="sm:hidden">
                  <div className="flex flex-wrap gap-1.5">
                    {(showAllExpenses ? COMMON_EXPENSES : COMMON_EXPENSES.slice(0, COLLAPSED_LIMIT)).map((expense) => (
                      <button
                        key={expense.name}
                        type="button"
                        onClick={() => { setName(expense.name); setCategory(expense.category); }}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:bg-blue-400/10 dark:hover:text-blue-300"
                      >
                        {expense.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowAllExpenses((prev) => !prev)}
                      className="rounded-full border border-dashed border-slate-300 bg-transparent px-3 py-1 text-xs text-slate-500 transition hover:border-slate-400 hover:text-slate-700 dark:border-white/20 dark:text-slate-400 dark:hover:border-white/35 dark:hover:text-slate-200"
                    >
                      {showAllExpenses ? "Vis færre" : `+${COMMON_EXPENSES.length - COLLAPSED_LIMIT} flere`}
                    </button>
                  </div>
                </div>

                {/* Desktop: vis alle */}
                <div className="hidden sm:flex sm:flex-wrap sm:gap-1.5">
                  {COMMON_EXPENSES.map((expense) => (
                    <button
                      key={expense.name}
                      type="button"
                      onClick={() => { setName(expense.name); setCategory(expense.category); }}
                      className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:border-blue-400/40 dark:hover:bg-blue-400/10 dark:hover:text-blue-300"
                    >
                      {expense.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Navn <span className="text-rose-500">*</span></span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="f.eks. Huslån"
                className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:text-lg"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Kategori <span className="text-rose-500">*</span></span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/15 dark:bg-slate-600/70 dark:text-white sm:h-11 sm:text-base"
              >
                {allCategories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Beløb <span className="text-rose-500">*</span></span>
              <div className="relative">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={() => {
                    const normalised = amount.replace(",", ".").replace(/\s/g, "");
                    if (/^[\d+\-*/().]+$/.test(normalised)) {
                      try {
                        const result = Function(`"use strict"; return (${normalised})`)();
                        if (typeof result === "number" && Number.isFinite(result)) {
                          setAmount(String(Math.round(result * 100) / 100));
                        }
                      } catch {}
                    }
                  }}
                  placeholder="0,0"
                  inputMode="decimal"
                  className="h-10 w-full rounded-2xl border border-slate-300 bg-white px-4 pr-14 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400 sm:h-12 sm:px-4 sm:pr-14 sm:text-lg"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                  kr
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Indbygget lommeregner, f.eks. <span className="font-medium text-slate-700 dark:text-slate-300">14400/2</span>, hvis du deler udgiften med en anden.
              </p>
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

            {frequency !== "monthly" ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100 sm:text-sm">
                <span className="font-semibold">Tip:</span> Beløbet bliver automatisk omregnet til månedlig værdi.
              </div>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-slate-200 sm:text-base">Bankkonto</span>
              <select
                value={bankAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/15 dark:bg-slate-600/70 dark:text-white sm:h-11 sm:text-base"
              >
                <option value="">Ingen konto</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
              {isLoadingAccounts ? <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Henter bankkonti...</p> : null}
              {bankAccountError ? <p className="mt-1.5 text-xs text-rose-500">{bankAccountError}</p> : null}
              {!isLoadingAccounts && bankAccounts.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  Ingen bankkonti endnu.{" "}
                  <Link href="/account" className="font-semibold text-blue-600 hover:text-blue-500">Tilføj en konto</Link>.
                </p>
              ) : null}
            </label>

            {formError ? <p className="text-xs text-rose-600 dark:text-rose-300 sm:text-sm">{formError}</p> : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !isFormValid}
              className="mt-1 flex h-10 w-full items-center justify-center rounded-2xl bg-blue-500 text-base font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-2 sm:h-12 sm:text-lg"
            >
              {isSaving ? "Gemmer..." : isEditing ? "Gem ændringer" : "Tilføj"}
            </button>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
