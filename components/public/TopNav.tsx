import Link from "next/link";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { Button } from "@/components/ui/Button";
import { GooeyNav } from "@/components/GooeyNav";
import { signOut } from "@/app/(auth)/actions";

// Top nav appears on every public-register page. Per design brief §6.1:
// 56px height, single row, left wordmark + minimal links, no shadow,
// just a 1px bottom border.

const NAV_ITEMS: { label: string; href: string; key: "sessions" | "simulations" | "about" }[] = [
  { label: "Sessions",    href: "/sessions",    key: "sessions" },
  { label: "Simulations", href: "/simulations", key: "simulations" },
  { label: "About",       href: "/about",       key: "about" },
];

export function TopNav({
  current,
  signedIn,
}: {
  current?: "sessions" | "simulations" | "about";
  signedIn: boolean;
}) {
  return (
    <header className="topnav" style={{ padding: "0 56px" }}>
      <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
        <Wordmark size={17} />
      </Link>
      <div style={{ marginLeft: 40 }}>
        <GooeyNav
          items={NAV_ITEMS.map(({ label, href, key }) => ({
            label,
            href,
            active: current === key,
          }))}
        />
      </div>
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
