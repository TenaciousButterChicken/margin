import Link from "next/link";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { Button } from "@/components/ui/Button";
import GooeyNav from "@/components/GooeyNav";
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
  const initialActiveIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((it) => it.key === current)
  );

  return (
    <header className="topnav" style={{ padding: "0 56px" }}>
      <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
        <Wordmark size={17} />
      </Link>
      <div
        style={{
          marginLeft: 40,
          // The React Bits GooeyNav is designed for dark backgrounds
          // (default text is white, gooey blob uses lighten-blend over a
          // black inset). We host it inside a dark capsule so the
          // original colors render correctly on our otherwise-white
          // top-nav.
          background: "#0b0b0d",
          borderRadius: 999,
          padding: "4px 6px",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <GooeyNav
          items={NAV_ITEMS.map(({ label, href }) => ({ label, href }))}
          initialActiveIndex={initialActiveIndex}
          particleCount={15}
          particleDistances={[90, 10]}
          particleR={100}
          animationTime={600}
          timeVariance={300}
          colors={[1, 2, 3, 1, 2, 3, 1, 4]}
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
