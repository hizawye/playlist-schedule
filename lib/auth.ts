import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function getAuthUserId(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.user?.id ?? null;
}
