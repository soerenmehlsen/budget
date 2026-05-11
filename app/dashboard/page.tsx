import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/services/dashboardService";
import type { DashboardData } from "@/services/dashboardService.types";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <DashboardClient userId={null} initialData={null} />;
  }

  let initialData: DashboardData | null = null;
  try {
    const result = await fetchDashboardData();
    initialData = result.data;
  } catch {
    // Fall back to client-side fetch on SSR error
  }

  return <DashboardClient userId={user.id} initialData={initialData} />;
}
