# Phase 0 — OAuth Validation Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm that Neil can sign in to margin.school with his school Google account `neil.moudgil27@ycdsbk12.ca` and land on a `/me` page showing his email. This is a go/no-go gate for the entire auth design — if YCDSB's Google Workspace blocks third-party OAuth consent, we discover it now (1-hour cost) instead of after building Phases 1–3 (weeks of cost).

**Architecture:** Replace the existing email/password sign-in scaffold with Supabase's Google OAuth provider. The user clicks "Sign in with Google", Supabase handles the round-trip with Google, our `/auth/callback` route exchanges the code for a session and bounces non-YCDSB emails. Successful sign-in lands on `/me`. No database tables, no profiles, no roles — just "are we authenticated as a YCDSB user."

**Tech Stack:** Next.js 14 App Router + TypeScript, Supabase Cloud (`@supabase/ssr` 0.10.2 + `@supabase/supabase-js` 2.105.0), Google Cloud OAuth 2.0.

**Repo:** `/Users/neilmoudgil/margin` (single-branch push-to-live workflow — work directly on `main`).

**Spec:** `docs/superpowers/specs/2026-04-29-auth-and-teacher-dashboard-design.md` (Phase 0 section).

---

## File Structure

**Created:**
- `lib/auth/domain.ts` — single function `isYcdsbEmail(email): boolean`. Reusable in Phases 1+.
- `app/auth/callback/route.ts` — OAuth callback. Exchanges the code for a session, runs the domain check, redirects.
- `app/me/page.tsx` — stub page showing the signed-in user's email and a sign-out button.

**Modified:**
- `app/(auth)/sign-in/SignInForm.tsx` — replace the email/password form with a "Sign in with Google" button.
- `app/(auth)/actions.ts` — remove `signIn`/`signUp` server actions; keep `signOut`.

**Deleted:**
- `app/(auth)/sign-up/page.tsx` (and the `sign-up/` directory) — sign-up is now the same as sign-in (one Google button creates the account on first use).

---

## Task 1: Configure Google Cloud OAuth Client (USER)

**Owner:** Neil (must be done in your own browser, signed into your personal Google account that owns the project).

**Time:** ~10 minutes.

- [ ] **Step 1: Open Google Cloud Console.** Go to https://console.cloud.google.com — sign in with whichever Google account you want to own this project (your personal Gmail is fine; you don't need to use the school account here).

- [ ] **Step 2: Create or select a project.** Top-left dropdown → "New Project" → name it `margin-school` (or reuse an existing one). Click Create. Wait for it to appear in the dropdown, then select it.

- [ ] **Step 3: Configure the OAuth consent screen.** Left sidebar → "APIs & Services" → "OAuth consent screen". Choose **External** (Internal isn't an option since you don't own the YCDSB Workspace). Click Create. Fill in:
  - App name: `Margin`
  - User support email: your personal email
  - App logo: skip
  - App domain: leave blank
  - Authorized domains: add `margin.school`
  - Developer contact email: your personal email
  - Click "Save and Continue".

- [ ] **Step 4: Add scopes.** On the Scopes step, click "Add or Remove Scopes". Select `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid`. Save and Continue.

- [ ] **Step 5: Add test users.** On the Test Users step, click "Add Users" and add `neil.moudgil27@ycdsbk12.ca` (just yours for now — the rest of the 16 students get added in Phase 1). Save and Continue. Click "Back to Dashboard".

- [ ] **Step 6: Create the OAuth Client ID.** Left sidebar → "APIs & Services" → "Credentials" → "+ Create Credentials" → "OAuth client ID". Application type: **Web application**. Name: `Margin Web`.

- [ ] **Step 7: Add Authorized JavaScript origins.** In the same form:
  - `https://margin.school`
  - `http://localhost:3000`

- [ ] **Step 8: Add the Authorized redirect URI.** This is the Supabase callback URL — find your Supabase project URL in `/Users/neilmoudgil/margin/.env.local` (the value of `NEXT_PUBLIC_SUPABASE_URL`, looks like `https://abcdefgh.supabase.co`). Append `/auth/v1/callback` to it. Add this single URI:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

  Click "Create".

- [ ] **Step 9: Copy the Client ID and Client Secret.** A modal appears showing both. **Copy them somewhere safe right now** — the Secret is only shown once in plain text. You'll paste them into Supabase in Task 2.

---

## Task 2: Configure Supabase Google Provider (USER)

**Owner:** Neil.

**Time:** ~5 minutes.

- [ ] **Step 1: Open the Supabase project.** Go to https://app.supabase.com and click into your `margin` project.

- [ ] **Step 2: Enable Google provider.** Left sidebar → "Authentication" → "Providers" → scroll to Google → click to expand → toggle "Enable Sign in with Google" to ON.

- [ ] **Step 3: Paste credentials.** Paste the Client ID and Client Secret from Google Cloud (Task 1, Step 9) into the matching fields. Click "Save".

- [ ] **Step 4: Configure URL settings.** Left sidebar → "Authentication" → "URL Configuration".
  - **Site URL:** `https://margin.school`
  - **Additional Redirect URLs:** add `http://localhost:3000/**` (this enables local-dev sign-in to redirect back to localhost). Click Save.

- [ ] **Step 5: Confirm callback URL displayed.** Back in Authentication → Providers → Google, the panel shows a "Callback URL (for OAuth)" — verify it matches what you put in Google Cloud's Authorized redirect URI in Task 1, Step 8. If it doesn't, copy this one to Google Cloud (it's the source of truth).

---

## Task 3: Add the domain check helper

**Files:**
- Create: `/Users/neilmoudgil/margin/lib/auth/domain.ts`

- [ ] **Step 1: Create the file with the helper.**

```ts
// lib/auth/domain.ts

const STUDENT_DOMAIN = "@ycdsbk12.ca";

/**
 * True when the email belongs to the YCDSB school domain.
 * Phase 0 uses this as the only allowlist gate; Phase 1 adds TEACHER_EMAILS.
 */
export function isYcdsbEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(STUDENT_DOMAIN);
}
```

- [ ] **Step 2: Manual sanity-check by reading.** Confirm:
  - `null` / `undefined` / `""` → returns `false` (the `!email` guard).
  - `"foo@gmail.com"` → returns `false`.
  - `"NEIL.MOUDGIL27@YCDSBK12.CA"` → returns `true` (the `.toLowerCase()` call).
  - `"someone@ycdsbk12.ca"` → returns `true`.

  No test runner is set up in this repo yet; reading is the verification for now. Phase 1 adds Vitest.

- [ ] **Step 3: Commit.**

```bash
git add lib/auth/domain.ts
git commit -m "Auth: add isYcdsbEmail domain check helper"
```

---

## Task 4: Build the OAuth callback route

**Files:**
- Create: `/Users/neilmoudgil/margin/app/auth/callback/route.ts`

This is the route Google redirects back to (via Supabase). It exchanges the OAuth code for a session, runs the domain check, and redirects.

- [ ] **Step 1: Create the route handler.**

```ts
// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isYcdsbEmail } from "@/lib/auth/domain";

// OAuth callback. Supabase redirects here with `?code=...` after Google
// authenticates the user. We exchange the code for a session, then enforce
// the YCDSB domain check.

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth&code=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=oauth&code=missing_code`);
  }

  const supabase = createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=oauth&code=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isYcdsbEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/sign-in?error=domain`);
  }

  return NextResponse.redirect(`${origin}/me`);
}
```

- [ ] **Step 2: Verify imports resolve.** The `@/` alias maps to the project root per `tsconfig.json`. Check that:
  - `@/lib/supabase/server` exists (it does — already in the scaffold).
  - `@/lib/auth/domain` exists (you just created it in Task 3).

  Quick check:

```bash
ls /Users/neilmoudgil/margin/lib/supabase/server.ts /Users/neilmoudgil/margin/lib/auth/domain.ts
```

  Expected: both files listed, no "No such file" errors.

- [ ] **Step 3: Commit.**

```bash
git add app/auth/callback/route.ts
git commit -m "Auth: add /auth/callback route for OAuth code exchange"
```

---

## Task 5: Build the `/me` stub page

**Files:**
- Create: `/Users/neilmoudgil/margin/app/me/page.tsx`

A signed-in user lands here after `/auth/callback` succeeds. Shows their email and a sign-out button. Visual style matches the existing sign-in page (neutral-50 bg, neutral-200 bordered card).

- [ ] **Step 1: Create the page.**

```tsx
// app/me/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

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
            Hello, {user.email}
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
            You're signed in.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="primary">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm `Button` and `Wordmark` import paths.** The existing sign-in page already imports these from the same paths, so they exist:

```bash
ls /Users/neilmoudgil/margin/components/ui/Button.tsx /Users/neilmoudgil/margin/components/illustrations/Wordmark.tsx
```

- [ ] **Step 3: Commit.**

```bash
git add app/me/page.tsx
git commit -m "Auth: add /me stub page showing signed-in user"
```

---

## Task 6: Replace the sign-in form with a Google button

**Files:**
- Modify: `/Users/neilmoudgil/margin/app/(auth)/sign-in/SignInForm.tsx`

Rewrite the existing email/password form as a single "Sign in with Google" button. Keeps the page wrapper and Suspense boundary in `page.tsx` unchanged.

- [ ] **Step 1: Replace the file contents.** Replace the entire current `SignInForm.tsx` with:

```tsx
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
        // hd is a UX hint to Google's account picker; the server-side
        // domain check in /auth/callback is what actually enforces it.
        queryParams: { hd: "ycdsbk12.ca" },
      },
    });
    if (error) {
      setPending(false);
      console.error("OAuth init error:", error);
    }
    // On success, the browser is being redirected to Google — leave pending=true.
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
```

- [ ] **Step 2: Commit.**

```bash
git add "app/(auth)/sign-in/SignInForm.tsx"
git commit -m "Auth: replace email/password form with Sign in with Google button"
```

---

## Task 7: Remove sign-up page and old email/password actions

**Files:**
- Delete: `/Users/neilmoudgil/margin/app/(auth)/sign-up/page.tsx` (and the `sign-up/` directory)
- Modify: `/Users/neilmoudgil/margin/app/(auth)/actions.ts`

With OAuth, sign-up = sign-in (the first time you click the Google button, your account is created). The separate sign-up page is now a footgun.

- [ ] **Step 1: Delete the sign-up directory.**

```bash
rm -rf "/Users/neilmoudgil/margin/app/(auth)/sign-up"
```

- [ ] **Step 2: Verify it's gone.**

```bash
ls "/Users/neilmoudgil/margin/app/(auth)/"
```

  Expected: lists `actions.ts` and `sign-in/` only — no `sign-up/`.

- [ ] **Step 3: Replace `actions.ts` with just `signOut`.**

```ts
// app/(auth)/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
```

- [ ] **Step 4: Commit.**

```bash
git add "app/(auth)/sign-up" "app/(auth)/actions.ts"
git commit -m "Auth: remove sign-up page and email/password actions"
```

---

## Task 8: Local smoke test

**Owner:** Neil (runs commands on your Mac).

**Time:** ~5 minutes.

The first real test of whether OAuth works at all — done locally before deploying.

- [ ] **Step 1: Start the dev server.** From a terminal:

```bash
cd /Users/neilmoudgil/margin && npm run dev
```

  Wait for `✓ Ready` and `Local: http://localhost:3000`.

- [ ] **Step 2: Open the sign-in page.** In a browser (use a regular window, not incognito — Google's account picker needs your existing sessions): http://localhost:3000/sign-in

  Expected: a card with the Margin wordmark, "Sign in" header, "Use your YCDSB school account" subtitle, and a single "Sign in with Google" button.

- [ ] **Step 3: Click "Sign in with Google".** Two things can happen:
  - **Best case:** Google's account picker opens. Your `neil.moudgil27@ycdsbk12.ca` account appears (because of the `hd=ycdsbk12.ca` hint). Click it.
  - **Stuck on Margin:** an error in the console — check the dev-server terminal and the browser DevTools console. Most common: misconfigured Supabase URL/anon key in `.env.local` (load it again — `cat .env.local`), or Google Cloud OAuth Client not actually saved. Re-check Tasks 1 and 2.

- [ ] **Step 4: Complete Google's consent flow.** Google may show a "This app isn't verified" warning — click "Advanced" → "Go to Margin (unsafe)" (it's only "unsafe" because you haven't gone through Google verification, which isn't needed for ≤100 test users). If your school account is rejected entirely with a message like "This app is blocked", **STOP** — Phase 0 has failed. Skip to the "If Phase 0 fails" section at the bottom of this plan.

- [ ] **Step 5: Confirm you land on `/me`.**

  Expected: URL is `http://localhost:3000/me`. Page shows "Hello, neil.moudgil27@ycdsbk12.ca" and a Sign out button.

  If you get an "Internal Server Error" or 500: check the dev-server terminal for the stack trace and report it back so we can fix.

  If you get redirected to `/sign-in?error=domain`: the domain check is too strict somehow. Run `console.log(user.email)` in the callback route and re-investigate.

- [ ] **Step 6: Stretch — try a non-YCDSB account.** Sign out (the button), then click "Sign in with Google" again, but pick your personal Gmail this time.

  Expected: bounced back to `/sign-in?error=domain` with the message "Please sign in with a @ycdsbk12.ca account."

- [ ] **Step 7: Stop the dev server.** `Ctrl+C` in the dev-server terminal.

---

## Task 9: Push and deploy to the Pi

**Owner:** Neil.

**Time:** ~3 minutes.

- [ ] **Step 1: Push to GitHub from Mac.**

```bash
git -C /Users/neilmoudgil/margin push
```

  Expected: a `main -> main` line indicating the push succeeded.

- [ ] **Step 2: SSH to the Pi.**

```bash
ssh raspberry-pi-geek09@10.0.0.123
```

  (Local IP, not Tailscale — per your prior preference.)

- [ ] **Step 3: Pull, build, restart.** On the Pi:

```bash
cd ~/margin && git pull && rm -rf .next && npm run build && sudo systemctl restart margin
```

  Watch the build output. Expected:
  - `git pull` shows the new commits.
  - `npm run build` finishes with `✓ Compiled successfully` and route summary including `/auth/callback`, `/me`, `/sign-in`. Should not include `/sign-up`.
  - `systemctl restart margin` returns silently.

- [ ] **Step 4: Verify the service is running.**

```bash
sudo systemctl status margin --no-pager
```

  Expected: `active (running)`.

- [ ] **Step 5: Exit the Pi.**

```bash
exit
```

---

## Task 10: Production smoke test — the pass condition

**Owner:** Neil.

**Time:** ~2 minutes.

This is the gate. Pass = Phase 0 succeeded, we can plan Phase 1. Fail = pivot.

- [ ] **Step 1: Open the live sign-in page.** In a regular browser window: https://margin.school/sign-in

  Expected: same card you saw on localhost.

- [ ] **Step 2: Sign in with the school account.** Click the Google button. Pick `neil.moudgil27@ycdsbk12.ca`. Approve any consent screens.

- [ ] **Step 3: Confirm you land on `/me` showing your email.**

  URL: `https://margin.school/me`. Page: "Hello, neil.moudgil27@ycdsbk12.ca".

  **If yes — Phase 0 PASSES.** YCDSB allows third-party OAuth consent. Onward to planning Phase 1.

  **If no — Phase 0 FAILS.** Note exactly what happened (error message, URL state, browser console). See the failure section below.

- [ ] **Step 4: Try sign-out.** Click "Sign out". Expected: redirected to `/`. Confirm `/me` is no longer accessible (revisiting it should redirect to `/sign-in`).

- [ ] **Step 5: Report status.** In our chat, tell me:
  - "Phase 0 passed" — and we move to Phase 1 planning.
  - "Phase 0 failed because [exact error]" — and we look at fallback options.

---

## If Phase 0 fails

The spec defines the pivot: switch from Google OAuth to autoconfirm email/password. Concretely:

1. In Supabase Authentication → Providers → Email, enable but **disable email confirmation** (autoconfirm = on). This means typo'd emails create dead accounts but every other flow works without ever sending an email.
2. The sign-in form goes back to email + password fields. Sign-up form too.
3. Both forms server-side check that the email ends in `@ycdsbk12.ca` (using the same `isYcdsbEmail` helper from Task 3 — it's reusable).
4. Everything from Phase 1 onward (profiles, RLS, tracking, dashboard) works identically — the only difference is the auth provider feeding the same downstream logic.

Don't execute the pivot yet. First report what failed, so we choose the right next move.

---

## Self-Review Checklist

I went through this plan against the Phase 0 section of the spec:

- ✓ Google Cloud OAuth client setup → Task 1
- ✓ Supabase Google provider configuration → Task 2
- ✓ Sign-in page replaced with Google button → Task 6
- ✓ `/auth/callback` route → Task 4
- ✓ Server-side domain check → Tasks 3 (helper) + 4 (used in callback)
- ✓ Stub `/me` page → Task 5
- ✓ Pass condition (Neil signs in, lands on /me) → Task 10
- ✓ "If Phase 0 fails" pivot documented at end of plan
- ✓ Cleanup of unused sign-up scaffold → Task 7
- ✓ Deploy via Pi (single-branch push-to-live) → Task 9
- ✓ All steps include exact code or exact commands. No "TBD", no "add appropriate error handling".
