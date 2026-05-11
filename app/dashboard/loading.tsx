import { BottomNav } from "@/components/bottom-nav";

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#09111f] dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.04),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.02),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.08),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(9,17,31,0.9)_0%,rgba(9,17,31,0.97)_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[860px] px-3 pb-28 pt-6 sm:px-5 sm:pt-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-20">
        <section className="mx-auto w-full rounded-[2rem] border border-slate-200 bg-slate-50/50 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-5 lg:rounded-[1.5rem] lg:p-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-1 sm:px-0">
            <Bone className="h-8 w-28 sm:h-9 sm:w-36" />
            <Bone className="h-8 w-32 rounded-2xl sm:h-9 sm:w-36" />
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4">
            {[0, 1].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/40 sm:p-4 lg:col-span-2 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Bone className="h-3 w-16" />
                    <Bone className="h-3 w-20" />
                  </div>
                  <Bone className="h-8 w-8 shrink-0 rounded-xl sm:h-10 sm:w-10" />
                </div>
                <Bone className="mt-4 h-6 w-28 sm:h-8" />
                <div className="mt-4 space-y-2">
                  <Bone className="h-2 w-full rounded-full" />
                  <Bone className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* Rådighedsbeløb */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/40 sm:mt-5 sm:rounded-[1.75rem] sm:p-5 lg:rounded-2xl">
            <Bone className="h-5 w-48 sm:h-7" />
            <Bone className="mt-3 h-9 w-40 sm:h-11 sm:w-52" />
            <Bone className="mt-2 h-3 w-24" />
          </div>

          {/* Kategori-udgifter */}
          <div className="mt-6 sm:mt-7">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-44 sm:h-7" />
              <div className="flex gap-2">
                <Bone className="h-8 w-24 rounded-lg sm:h-10 sm:w-28" />
                <Bone className="h-8 w-8 rounded-lg sm:h-10 sm:w-10" />
              </div>
            </div>
            <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/15 dark:bg-slate-800/75">
                  <div className="flex items-center justify-between px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <Bone className="h-7 w-7 rounded-xl" />
                      <Bone className="h-4 w-24 sm:w-32" />
                    </div>
                    <Bone className="h-4 w-16" />
                  </div>
                  <div className="border-t border-slate-200 px-3 py-2 dark:border-white/10 sm:px-4 sm:py-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex justify-between py-1">
                        <Bone className="h-3 w-28" />
                        <Bone className="h-3 w-14" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overførsler */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-800/40 sm:mt-7 sm:rounded-[1.75rem] sm:p-5 lg:rounded-2xl">
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 rounded-2xl" />
              <div className="space-y-2">
                <Bone className="h-3 w-24" />
                <Bone className="h-4 w-48 sm:w-64" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900/60">
                  <div className="space-y-1.5">
                    <Bone className="h-4 w-32" />
                    <Bone className="h-3 w-24" />
                  </div>
                  <Bone className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <BottomNav activeItem="Oversigt" />
      </div>
    </main>
  );
}
