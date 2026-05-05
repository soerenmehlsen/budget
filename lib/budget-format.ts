import type { Frequency } from "@/types/budget";

export const MONEY_FORMATTER = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCompactDkk(amount: number) {
  return `${MONEY_FORMATTER.format(amount).replace("DKK", "kr").trim()}`;
}

export function frequencyToPeriodLabel(frequency: Frequency): string {
  switch (frequency) {
    case "monthly": return "måned";
    case "quarterly": return "kvartal";
    case "halfYearly": return "halvår";
    case "yearly": return "år";
    default: return "måned";
  }
}

export function frequencyToMonthlyAmount(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case "monthly": return amount;
    case "quarterly": return amount / 3;
    case "halfYearly": return amount / 6;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

export function periodLabelToFrequencyText(periodLabel: string | null | undefined): string {
  switch (periodLabel) {
    case "kvartal": return "Kvartalsvis";
    case "halvår": return "Halvårlig";
    case "år": return "Årlig";
    default: return "Månedlig";
  }
}

export function periodLabelToFrequency(periodLabel: string | null | undefined): Frequency {
  switch (periodLabel) {
    case "kvartal": return "quarterly";
    case "halvår": return "halfYearly";
    case "år": return "yearly";
    default: return "monthly";
  }
}
