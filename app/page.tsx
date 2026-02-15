import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard-client";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userDisplayName =
    session.user.name?.trim() || session.user.email?.trim() || "your account";

  return <DashboardClient userDisplayName={userDisplayName} />;
}
