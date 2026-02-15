import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getAuthSession } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getAuthSession();

  if (session?.user?.id) {
    redirect("/");
  }

  const callbackUrl = "/";
  const oauthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute top-[-140px] left-[-160px] size-[420px] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-160px] bottom-[-160px] size-[420px] rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-5 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
          Playlist Schedule
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Sign in to sync playlists and progress
        </h1>
        <p className="text-muted-foreground max-w-xl text-sm">
          Your watch plans are stored per account in Postgres. Use Google to access
          your private dashboard.
        </p>
        {oauthConfigured ? (
          <GoogleSignInButton callbackUrl={callbackUrl} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Google OAuth is not configured yet. Set `AUTH_GOOGLE_ID` and
            `AUTH_GOOGLE_SECRET` in your environment.
          </p>
        )}
      </div>
    </main>
  );
}
