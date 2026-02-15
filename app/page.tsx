import { DashboardClient } from "@/components/dashboard-client";
import { LandingPage } from "@/components/landing-page";
import { getAuthSession } from "@/lib/auth";

interface HomePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    const resolvedSearchParams = (await searchParams) ?? {};
    return <LandingPage searchParams={resolvedSearchParams} />;
  }

  const userDisplayName =
    session.user.name?.trim() || session.user.email?.trim() || "your account";

  return <DashboardClient userDisplayName={userDisplayName} />;
}
