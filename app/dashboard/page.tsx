import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/services/dashboardService";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <DashboardClient userId={null} initialData={null} />;
  }

  const { data } = await fetchDashboardData();
  return <DashboardClient userId={user.id} initialData={data} />;
}
