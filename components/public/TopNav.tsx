import Link from "next/link";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/app/(auth)/actions";

// Top nav appears on every public-register page. Per design brief §6.1:
// 56px height, single row, left wordmark + minimal links, no shadow,
// just a 1px bottom border.

export function TopNav({
  current,
  signedIn,
}: {
  current?: "sessions" | "about";
  signedIn: boolean;
}) {
  return (
    <header className="topnav" style={{ padding: "0 56px" }}>
      <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
        <Wordmark size={17} />
      </Link>
      <nav style={{ marginLeft: 40, display: "flex", alignItems: "center", gap: 28 }}>
        <NavLink href="/sessions" active={current === "sessions"}>
          Sessions
        </NavLink>
        <NavLink href="/about" active={current === "about"}>
          About
        </NavLink>
      </nav>
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        {signedIn ? (
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
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
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 14,
        color: active ? "var(--neutral-900)" : "var(--neutral-700)",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
        position: "relative",
        paddingBottom: 18,
      }}
    >
      {children}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -1,
            height: 2,
            background: "var(--accent)",
          }}
        />
      )}
    </Link>
  );
}
