"use client";

import { useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { PlusIcon } from "@/components/ui/plus";
import { useSession } from "@/hooks/useSession";
import { useExpenses } from "@/hooks/useExpenses";
import type { ExpenseFormValues } from "@/hooks/useExpenses";
import type { ExpenseItem } from "@/types/budget";
import { formatCompactDkk } from "@/lib/budget-format";
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
    if (editingItem) {
      await updateExpense(editingItem.id, values);
    } else {
      await addExpense(values);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Vil du slette denne udgift?")) return;
    try {
      await removeExpense(id);
      closeModal();
    } catch {
      window.alert("Kunne ikke slette udgift. Prøv igen.");
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
            <AnimatedIconButton
              type="button"
              onClick={() => openAdd()}
              Icon={PlusIcon}
              iconSize={20}
              className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/30 bg-blue-500 text-white shadow-[0_15px_45px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-300/35"
              aria-label="Tilføj udgift"
            />
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
            <p className="text-sm text-slate-700 dark:text-slate-300">{formatCompactDkk(totalMonthly)}/md</p>
          </div>

          <div className="mt-4 space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
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
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Opdaterer udgifter...</p>
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
