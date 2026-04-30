"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/illustrations/Wordmark";

export function SignInForm() {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const error = params.get("error");

  async function signInWithGoogle() {
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "ycdsbk12.ca" },
      },
    });
    if (error) {
      setPending(false);
      console.error("OAuth init error:", error);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--neutral-50)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: "var(--r-md)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Link href="/" style={{ alignSelf: "flex-start", textDecoration: "none" }}>
          <Wordmark size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            Sign in
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
            Use your YCDSB school account.
          </p>
        </div>

        {error === "domain" && (
          <div
            style={{
              fontSize: 13,
              color: "var(--neutral-700)",
              background: "var(--accent-subtle)",
              borderRadius: 6,
              padding: "10px 12px",
              lineHeight: 1.5,
            }}
          >
            Please sign in with a @ycdsbk12.ca account.
          </div>
        )}

        {error === "oauth" && (
          <div
            style={{
              fontSize: 13,
              color: "var(--danger)",
              background: "var(--neutral-100)",
              borderRadius: 6,
              padding: "10px 12px",
              lineHeight: 1.5,
            }}
          >
            Sign-in failed. Please try again.
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={signInWithGoogle}
        >
          {pending ? "Redirecting…" : "Sign in with Google"}
        </Button>
      </div>
    </div>
  );
}
