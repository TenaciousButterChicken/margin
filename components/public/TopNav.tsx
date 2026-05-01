"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { Button } from "@/components/ui/Button";
import { GooeyNav } from "@/components/GooeyNav";
import UserAvatar from "@/components/public/UserAvatar";
import { signOut } from "@/app/(auth)/actions";

// Top nav appears on every public-register page. Per design brief §6.1:
// 56px height, single row, left wordmark + minimal links, no shadow,
// just a 1px bottom border.
//
// Mobile (≤640px): the row collapses to wordmark + hamburger; tapping
// hamburger reveals a panel with the same links + auth actions.

const NAV_ITEMS: { label: string; href: string; key: "sessions" | "simulations" | "about" }[] = [
  { label: "Sessions",    href: "/sessions",    key: "sessions" },
  { label: "Simulations", href: "/simulations", key: "simulations" },
  { label: "About",       href: "/about",       key: "about" },
];

export function TopNav({
  current,
  signedIn,
  email,
  role,
}: {
  current?: "sessions" | "simulations" | "about";
  signedIn: boolean;
  email?: string;
  role?: import("@/lib/auth/profile").RoleSlug;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="topnav" style={{ position: "relative" }}>
        <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
          <Wordmark size={17} />
        </Link>

        {/* Desktop links */}
        <div className="hide-mobile" style={{ marginLeft: 40 }}>
          <GooeyNav
            items={NAV_ITEMS.map(({ label, href, key }) => ({
              label,
              href,
              active: current === key,
            }))}
          />
        </div>

        {/* Desktop right side */}
        <div
          className="hide-mobile"
          style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}
        >
          {signedIn ? (
            <>
              {email && role && <UserAvatar email={email} role={role} />}
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="primary" size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="show-mobile-only"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "1px solid var(--neutral-200)",
            borderRadius: 6,
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--neutral-900)",
          }}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {open && (
        <div
          className="show-mobile-only"
          role="menu"
          style={{
            borderBottom: "1px solid var(--neutral-200)",
            background: "var(--neutral-0)",
            padding: "8px var(--topnav-pad-x) 16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {NAV_ITEMS.map(({ label, href, key }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                padding: "12px 4px",
                fontSize: 16,
                fontWeight: current === key ? 600 : 500,
                color: current === key ? "var(--accent)" : "var(--neutral-900)",
                textDecoration: "none",
                borderBottom: "1px solid var(--neutral-100)",
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {signedIn ? (
              <>
                {email && role && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                    <UserAvatar email={email} role={role} />
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--neutral-700)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {email}
                    </span>
                  </div>
                )}
                <form action={signOut} style={{ flex: "none" }}>
                  <Button type="submit" variant="ghost" size="sm">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Link href="/sign-in" style={{ flex: 1 }}>
                  <Button variant="ghost" size="sm" style={{ width: "100%" }}>
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up" style={{ flex: 1 }}>
                  <Button variant="primary" size="sm" style={{ width: "100%" }}>
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
