import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing-page";
import { getAuthSession } from "@/lib/auth";

interface SignInPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  return <LandingPage searchParams={resolvedSearchParams} />;
}
