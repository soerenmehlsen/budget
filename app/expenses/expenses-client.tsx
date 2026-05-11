"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { PlusIcon } from "@/components/ui/plus";
import { useSession } from "@/hooks/useSession";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseFormValues } from "@/hooks/useExpenses";
import type { ExpenseItem } from "@/types/budget";
import { formatCompactDkk } from "@/lib/budget-format";
import { isDemoMode } from "@/lib/demo-mode";
import { ExpenseCategoryGroup } from "./expense-category-group";
import { ExpenseFormModal } from "./expense-form-modal";

export function ExpensesClient() {
  const { userId, isCheckingSession } = useSession();
  const {
    groupedExpenses,
    bankAccounts,
    bankAccountLookup,
    dataSource,
    isLoading,
    isLoadingAccounts,
    isSaving,
    error,
    clearError,
    bankAccountError,
    totalMonthly,
    totalCount,
    addExpense,
    updateExpense,
    removeExpense,
  } = useExpenses(userId);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [preferredCategory, setPreferredCategory] = useState("Abonnementer");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAllCollapsed =
    groupedExpenses.length > 0 &&
    groupedExpenses.every((group) => collapsedCategories[group.category] === true);

  const openAdd = (category = "Abonnementer") => {
    setEditingItem(null);
    setPreferredCategory(category);
    setIsModalOpen(true);
  };

  const openEdit = (item: ExpenseItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const toggleAll = () => {
    const nextValue = !isAllCollapsed;
    const nextState: Record<string, boolean> = {};
    for (const group of groupedExpenses) nextState[group.category] = nextValue;
    setCollapsedCategories(nextState);
  };

  const handleSave = async (values: ExpenseFormValues) => {
    clearError();
    try {
      if (editingItem) {
        await updateExpense(editingItem.id, values);
      } else {
        await addExpense(values);
      }
      closeModal();
    } catch {
      // error is handled in the hook
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Vil du slette denne udgift?")) return;
    try {
      await removeExpense(id);
      closeModal();
    } catch {
      // error is handled in the hook
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.88)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-start justify-between gap-3 px-1 sm:gap-4 sm:px-0"
          >
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Udgifter</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">{totalCount} faste udgifter</p>
            </div>
            <AnimatedIconButton
              type="button"
              onClick={() => openAdd()}
              Icon={PlusIcon}
              iconSize={20}
              className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/30 bg-blue-500 text-white shadow-[0_15px_45px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-300/35"
              aria-label="Tilføj udgift"
            />
          </motion.header>

          {isDemoMode() ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100"
            >
              Demo mode. Her kan man tilføje og rette sine <span className="font-semibold">udgifter</span>, hvor man selv vælger kategori og bankkonto. Hver udgift bliver automatisk beregnet til månedlige beløb.
            </motion.p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            className="mt-5 flex items-center justify-between sm:mt-6"
          >
            <AnimatedIconButton
              type="button"
              onClick={toggleAll}
              Icon={ChevronDownIcon}
              iconSize={14}
              iconClassName={`transition ${isAllCollapsed ? "rotate-0" : "rotate-180"}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              {isAllCollapsed ? "Fold alle ud" : "Fold alle ind"}
            </AnimatedIconButton>
            <p className="text-sm text-slate-700 dark:text-slate-300">{formatCompactDkk(totalMonthly)}/md</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.18 }}
            className="mt-4 space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0"
          >
            {groupedExpenses.map((group) => (
              <ExpenseCategoryGroup
                key={group.category}
                group={group}
                bankAccountLookup={bankAccountLookup}
                isCollapsed={collapsedCategories[group.category] === true}
                onToggle={() => setCollapsedCategories((prev) => ({ ...prev, [group.category]: !(prev[group.category] === true) }))}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAdd={openAdd}
              />
            ))}
          </motion.div>

          {error ? (
            <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>
          ) : null}
        </section>

        <BottomNav activeItem="Udgifter" />
      </div>

      {isModalOpen ? (
        <ExpenseFormModal
          key={editingItem?.id ?? "new"}
          editingItem={editingItem}
          preferredCategory={preferredCategory}
          isSaving={isSaving}
          bankAccounts={bankAccounts}
          isLoadingAccounts={isLoadingAccounts}
          bankAccountError={bankAccountError}
          existingCategories={groupedExpenses.map((g) => g.category)}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}
    </main>
  );
}
