const DEMO_MODE_KEY = "budget-demo-mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function enableDemoMode(): void {
  localStorage.setItem(DEMO_MODE_KEY, "true");
  document.cookie = `${DEMO_MODE_KEY}=true; path=/; SameSite=Lax`;
}

export function disableDemoMode(): void {
  localStorage.removeItem(DEMO_MODE_KEY);
  document.cookie = `${DEMO_MODE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}
