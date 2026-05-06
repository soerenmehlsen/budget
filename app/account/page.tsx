"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Share, Plus, Smartphone, MoreHorizontal } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutIcon, type LogoutIconHandle } from "@/components/ui/logout";
import { supabase } from "@/lib/supabase/client";
import { submitFeedback } from "@/app/actions/feedback";

export default function AccountPage() {
  const router = useRouter();
  const logoutIconRef = useRef<LogoutIconHandle>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!data.session) {
        router.replace("/");
        return;
      }

      setUserId(data.session.user.id);
      setUserEmail(data.session.user.email ?? null);
      setIsCheckingSession(false);
    };

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const handleSendFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!feedback.trim()) {
      setFeedbackError("Skriv din feedback først.");
      setFeedbackMessage(null);
      return;
    }

    if (!userId) {
      setFeedbackError("Kunne ikke finde bruger. Prøv igen.");
      setFeedbackMessage(null);
      return;
    }

    setIsSendingFeedback(true);
    setFeedbackError(null);
    setFeedbackMessage(null);

    const result = await submitFeedback(userId, feedback.trim());

    setIsSendingFeedback(false);

    if (!result.success) {
      setFeedbackError("Kunne ikke sende feedback. Tjek at tabellen feedback findes.");
      return;
    }

    setFeedback("");
    setFeedbackMessage("Tak. Din feedback er sendt.");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
        <p className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm text-slate-600 shadow-[0_20px_60px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
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
            className="px-1 sm:px-0"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Konto</h1>
            {userEmail ? (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 sm:mt-1 sm:text-sm">
                {userEmail}
              </p>
            ) : null}
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
            className="mt-4"
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
              <div className="flex items-center gap-2">
                <Smartphone size={20} className="text-blue-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gem som en app</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Tilføj hjemmesiden Mit Budget til din hjemmeskærm og brug den som en rigtig app.
              </p>

              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">1</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Åbn i Safari</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Hjemmeskærmsfunktionen er bedst i Safari på iPhone.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">2</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Tryk på{" "}
                      <MoreHorizontal size={13} className="mb-0.5 inline text-slate-500 dark:text-slate-400" />
                      {" "}knappen
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Knappen med tre prikker sidder i højre side af adresselinjen.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">3</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Tryk på del-knappen{" "}
                      <Share size={13} className="mb-0.5 inline text-slate-500 dark:text-slate-400" />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Del-knappen dukker op i menuen der åbner sig.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">4</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Vælg{" "}
                      <span className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-700 dark:text-slate-200">
                        <Plus size={10} />
                        Føj til hjemmeskærm
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Scroll ned i menuen indtil du finder denne mulighed.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">5</span>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Tryk på Tilføj</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Appen vises nu på din hjemmeskærm, ligesom en rigtig app.</p>
                  </div>
                </li>
              </ol>
            </section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="mt-6"
          >
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Feedback</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Send ideer, fejl eller ønsker direkte til Søren.
              </p>

              <form className="mt-4 space-y-3" onSubmit={handleSendFeedback}>
                <label className="block">
                  <span className="sr-only">Feedback</span>
                  <textarea
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Skriv din feedback her..."
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-600/65 dark:text-white dark:placeholder:text-slate-400"
                  />
                </label>

                {feedbackError ? (
                  <p className="text-sm text-rose-600 dark:text-rose-300">{feedbackError}</p>
                ) : null}
                {feedbackMessage ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">{feedbackMessage}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSendingFeedback || !feedback.trim()}
                  className="flex h-11 w-full items-center justify-center rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70 sm:h-12"
                >
                  {isSendingFeedback ? "Sender..." : "Send feedback"}
                </button>
              </form>
            </section>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
            type="button"
            onClick={handleSignOut}
            onMouseEnter={() => logoutIconRef.current?.startAnimation()}
            onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-300/25 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15"
          >
            <LogoutIcon ref={logoutIconRef} size={18} />
            Log ud
          </motion.button>
        </section>

        <BottomNav activeItem="Konto" />
      </div>
    </main>
  );
}
