import { ArrowRight, CalendarClock, ListChecks, TimerReset } from "lucide-react";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access was denied for this account. Try again with a different Google account.",
  Configuration: "Google sign-in is not configured correctly. Check server environment variables.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Use the original provider first.",
  OAuthCallback:
    "Google sign-in could not complete. Please retry from the landing page.",
  OAuthSignin:
    "Google sign-in could not be started. Please retry from the landing page.",
  google: "Google sign-in could not be started. Please retry from the landing page.",
};

const BENEFITS = [
  {
    title: "Real completion dates",
    description:
      "Get projected finish dates based on your daily watch budget and playback speed.",
    icon: CalendarClock,
  },
  {
    title: "Playlist-level progress",
    description:
      "Track what is done, what is left, and how much time remains per playlist.",
    icon: ListChecks,
  },
  {
    title: "Adjust anytime",
    description:
      "Change pace, start dates, or speed and keep your plan aligned with your week.",
    icon: TimerReset,
  },
];

const HIGHLIGHTS = [
  {
    title: "Private account scope",
    description: "Your imported playlists and progress stay tied to your own login.",
  },
  {
    title: "Cross-device continuity",
    description: "Start on desktop, continue on mobile, and keep one shared schedule.",
  },
  {
    title: "Fast setup",
    description: "Paste playlists, define pace, and get projections in under a minute.",
  },
];

const WORKFLOW_STEPS = [
  {
    title: "Import playlists",
    description: "Paste one or more playlist links and add them to your private dashboard.",
  },
  {
    title: "Set your pace",
    description: "Define daily minutes, start date, and preferred playback speed.",
  },
  {
    title: "Track completion",
    description: "Mark videos watched and keep your completion target always up to date.",
  },
];

interface LandingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function readQueryValue(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}

function resolveCallbackUrl(rawValue: string | undefined): string {
  if (!rawValue) {
    return "/";
  }

  if (rawValue.startsWith("/")) {
    return rawValue;
  }

  try {
    const parsed = new URL(rawValue);
    const configuredAppUrl = process.env.NEXTAUTH_URL;
    if (configuredAppUrl) {
      const appOrigin = new URL(configuredAppUrl).origin;
      if (parsed.origin !== appOrigin) {
        return "/";
      }
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function resolveAuthErrorMessage(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[rawValue] ?? "Sign-in failed. Please retry.";
}

export function LandingPage({ searchParams }: LandingPageProps) {
  const oauthConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const callbackUrl = resolveCallbackUrl(readQueryValue(searchParams?.callbackUrl));
  const authErrorMessage = resolveAuthErrorMessage(
    readQueryValue(searchParams?.error)
  );

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 sm:px-10 sm:py-10 lg:px-16">
      <div className="pointer-events-none absolute top-[-180px] left-[-220px] size-[460px] rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-220px] bottom-[-220px] size-[500px] rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 pb-10 sm:gap-20">
        <section className="grid items-end gap-12 pt-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-12">
          <div className="space-y-6">
            <Badge variant="outline">Playlist Schedule</Badge>
            <h1 className="text-balance text-[clamp(2.2rem,5.5vw,4.35rem)] leading-[1.04] font-semibold tracking-[-0.03em]">
              Plan your playlist watch time with a schedule that stays realistic.
            </h1>
            <p className="text-muted-foreground max-w-[62ch] text-base leading-relaxed sm:text-lg">
              Import playlists, set your daily minutes, and track progress toward
              completion. Your plan is private to your account and available on any
              device after sign-in.
            </p>
            {oauthConfigured ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleSignInButton callbackUrl={callbackUrl} />
                <Button asChild variant="ghost" size="lg" className="px-0 sm:px-4">
                  <a href="#how-it-works">
                    How it works
                    <ArrowRight />
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-amber-300">
                Google OAuth is not configured. Set `AUTH_GOOGLE_ID` and
                `AUTH_GOOGLE_SECRET` to enable sign-in.
              </p>
            )}
            {authErrorMessage ? (
              <p
                className="text-destructive text-sm leading-relaxed"
                role="alert"
              >
                {authErrorMessage}
              </p>
            ) : null}
          </div>
          <div className="space-y-5">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
              Why teams and solo learners use it
            </p>
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article
                  key={benefit.title}
                  className="space-y-2 border-t border-border/60 pt-4"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <Icon className="text-muted-foreground size-4" />
                    {benefit.title}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-7 sm:grid-cols-3">
          {HIGHLIGHTS.map((highlight) => (
            <article key={highlight.title} className="space-y-2">
              <p className="text-sm font-semibold sm:text-base">{highlight.title}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {highlight.description}
              </p>
            </article>
          ))}
        </section>

        <section id="how-it-works" className="space-y-6">
          <h2 className="text-balance text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            A three-step workflow built for daily consistency.
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step.title} className="space-y-3">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                  Step {index + 1}
                </p>
                <p className="text-base font-semibold">{step.title}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-border/60 pt-5 text-sm">
          <p className="text-muted-foreground">
            Private by default. Sign in with Google to load your personal
            dashboard.
          </p>
        </footer>
      </div>
    </main>
  );
}
