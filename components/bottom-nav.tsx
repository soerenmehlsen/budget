"use client";

import type { ComponentType, HTMLAttributes } from "react";
import Link from "next/link";

import { HomeIcon } from "@/components/ui/home";
import { InfoIcon } from "@/components/ui/info";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { UserIcon } from "@/components/ui/user";
import { WalletIcon } from "@/components/ui/wallet";
import { cn } from "@/lib/utils";

type NavItemLabel = "Oversigt" | "Udgifter" | "Indkomst" | "Om" | "Konto";

type BottomNavProps = {
  activeItem?: NavItemLabel;
};

type NavIcon = ComponentType<HTMLAttributes<HTMLDivElement> & { size?: number }>;

const NAV_ITEMS: {
  label: NavItemLabel;
  href: string | null;
  Icon: NavIcon;
}[] = [
  { label: "Oversigt", href: "/dashboard", Icon: HomeIcon },
  { label: "Udgifter", href: "/expenses", Icon: WalletIcon },
  { label: "Indkomst", href: "/income", Icon: TrendingUpIcon },
  { label: "Om", href: null, Icon: InfoIcon },
  { label: "Konto", href: null, Icon: UserIcon },
];

export function BottomNav({ activeItem = "Oversigt" }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-slate-50/90 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/90 px-2 py-2 sm:px-3 sm:py-3">
      <div className="mx-auto flex w-full max-w-[860px] items-center justify-between">
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const isActive = label === activeItem;
          const className = cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors sm:rounded-2xl sm:px-4 sm:py-2 sm:text-sm",
            isActive
              ? "bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          );

          const content = (
            <>
              <Icon
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-95"
                size={22}
              />
              <span className={isActive ? "font-semibold" : undefined}>
                {label}
              </span>
            </>
          );

          if (!href) {
            return (
              <button
                key={label}
                type="button"
                className={className}
                disabled
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={label} href={href} className={cn("group", className)}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
