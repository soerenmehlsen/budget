import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordPanel from "../../components/reset-password-panel";

export const metadata: Metadata = {
  title: "Nulstil adgangskode | Budget",
  description: "Opret en ny adgangskode til Budget",
};

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.04),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.9)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <section className="w-full max-w-[460px] rounded-[2rem] border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-700 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:px-8 sm:py-10">
              Indlæser nulstilling...
            </section>
          }
        >
          <ResetPasswordPanel />
        </Suspense>
      </div>
    </main>
  );
}
