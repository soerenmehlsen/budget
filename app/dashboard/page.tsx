"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function DashboardPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!data.session) {
        router.replace("/");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setIsCheckingSession(false);
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/");
          return;
        }

        setEmail(session.user.email ?? null);
        setIsCheckingSession(false);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09111f] px-4 text-slate-100">
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          Tjekker session...
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09111f] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,17,31,0.9)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:px-8 sm:py-10">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-400">
            Budget test dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Dette er en midlertidig testside til at bekræfte login-flowet. Her
            kan vi senere lægge det rigtige økonomi-overblik, når resten af
            appen er klar.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Session</p>
              <p className="mt-2 text-lg font-semibold text-white">Aktiv</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Bruger</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {email ?? "Ukendt"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5">
              <p className="text-sm text-slate-400">Status</p>
              <p className="mt-2 text-lg font-semibold text-white">Test</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-8 h-14 rounded-2xl bg-blue-500 px-6 text-base font-semibold text-white shadow-[0_16px_36px_rgba(59,130,246,0.32)] transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
          >
            Log ud
          </button>
        </section>
      </div>
    </main>
  );
}