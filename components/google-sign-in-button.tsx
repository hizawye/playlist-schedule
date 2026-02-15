"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface GoogleSignInButtonProps {
  callbackUrl: string;
}

export function GoogleSignInButton({ callbackUrl }: GoogleSignInButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    try {
      setIsSubmitting(true);
      await signIn("google", { callbackUrl });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button size="lg" onClick={() => void handleSignIn()} disabled={isSubmitting}>
      Continue with Google
    </Button>
  );
}
