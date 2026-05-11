import { BottomNav } from "@/components/bottom-nav";

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60 ${className}`} />;
}

export default function AccountLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.88)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">

          {/* Header */}
          <div className="px-1 sm:px-0">
            <Bone className="h-8 w-20 sm:h-9 sm:w-24" />
            <Bone className="mt-2 h-3 w-44" />
          </div>

          {/* Gem som app */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
            <div className="flex items-center gap-2">
              <Bone className="h-5 w-5 shrink-0" />
              <Bone className="h-5 w-40" />
            </div>
            <Bone className="mt-2 h-3 w-full" />
            <Bone className="mt-1 h-3 w-3/4" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <Bone className="h-4 w-28" />
                    <Bone className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/70 sm:p-5">
            <Bone className="h-5 w-24" />
            <Bone className="mt-2 h-3 w-56" />
            <Bone className="mt-4 h-36 w-full rounded-2xl" />
            <Bone className="mt-3 h-11 w-full rounded-2xl" />
          </div>

          {/* Log ud */}
          <Bone className="mt-5 h-12 w-full rounded-2xl" />
        </section>

        <BottomNav activeItem="Konto" />
      </div>
    </main>
  );
}
