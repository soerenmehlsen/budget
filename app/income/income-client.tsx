"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { BottomNav } from "@/components/bottom-nav";
import { useSession } from "@/hooks/useSession";
import { useIncome } from "@/hooks/useIncome";
import type { IncomeFormValues } from "@/hooks/useIncome";
import type { IncomeItem } from "@/types/budget";
import { IncomeCard } from "./income-card";
import { IncomeFormModal } from "./income-form-modal";

export function IncomeClient() {
  const { userId, isCheckingSession } = useSession();
  const { incomeItems, dataSource, isLoading, isSaving, addIncome, updateIncome, removeIncome } = useIncome(userId);

  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAdd = () => { setEditingItem(null); setIsModalOpen(true); };
  const openEdit = (item: IncomeItem) => { setEditingItem(item); setIsModalOpen(true); };
  const closeModal = () => setIsModalOpen(false);

  const handleSave = async (values: IncomeFormValues) => {
    if (editingItem) {
      await updateIncome(editingItem.id, values);
    } else {
      await addIncome(values);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Vil du slette denne indtægtskilde?")) return;
    try {
      await removeIncome(id);
      closeModal();
    } catch {
      window.alert("Kunne ikke slette indkomst. Prøv igen.");
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
          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex items-start justify-between gap-3 px-1 sm:gap-4 sm:px-0"
          >
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Indkomst</h1>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">Indkomst efter skat (beregnes til månedlig)</p>
            </div>
          </motion.header>

          {dataSource === "fallback" ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-100"
            >
              Viser test data. Tilføj selv din <span className="font-semibold">indkomst</span> for at få overblik over din økonomi.
            </motion.p>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-6 space-y-3 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
          >
            {incomeItems.map((item) => (
              <IncomeCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.18 }}
          >
            <button
              type="button"
              onClick={openAdd}
              className="mt-6 w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 text-center text-slate-700 transition hover:border-slate-400 dark:border-white/20 dark:text-white dark:hover:border-white/40"
            >
              <span className="text-2xl">+</span> Tilføj indtægtskilde
            </button>

            {isLoading ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Opdaterer indkomster...</p>
            ) : null}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-400/20 dark:bg-blue-400/10">
              <p className="text-sm text-blue-800 dark:text-blue-100">
                <span className="font-semibold">Tip:</span> Indtast din netto-løn (efter skat, AM-bidrag mv.). Det beløb du faktisk får udbetalt hver måned.
              </p>
            </div>
          </motion.div>
        </section>

        <BottomNav activeItem="Indkomst" />
      </div>

      {isModalOpen ? (
        <IncomeFormModal
          key={editingItem?.id ?? "new"}
          editingItem={editingItem}
          isSaving={isSaving}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}
    </main>
  );
}
