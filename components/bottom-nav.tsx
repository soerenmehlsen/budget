"use client";

type BottomNavProps = {
  activeItem?: "Oversigt" | "Udgifter" | "Indkomst" | "Om" | "Konto";
};

const NAV_ITEMS = ["Oversigt", "Udgifter", "Indkomst", "Om", "Konto"] as const;

export function BottomNav({ activeItem = "Oversigt" }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-slate-900/90 px-2 py-2 backdrop-blur-sm sm:px-3 sm:py-3">
      <div className="mx-auto flex w-full max-w-[860px] items-center justify-between">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === activeItem
                ? "rounded-lg bg-blue-500/25 px-2 py-1 text-xs font-semibold text-blue-300 sm:rounded-2xl sm:px-4 sm:py-2 sm:text-base"
                : "px-2 py-1 text-xs font-medium text-slate-400 sm:px-4 sm:py-2 sm:text-base"
            }
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}
