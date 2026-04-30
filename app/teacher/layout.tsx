import Link from "next/link";
import { requireTeacher } from "@/lib/teacher/guard";
import { signOut } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireTeacher();

  return (
    <div style={{ minHeight: "100vh", background: "var(--neutral-50)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 32px",
          background: "var(--neutral-0)",
          borderBottom: "1px solid var(--neutral-200)",
        }}
      >
        <Link href="/teacher" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <Wordmark size={20} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              padding: "2px 8px",
              borderRadius: 999,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Teacher
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "var(--neutral-700)" }}>{profile.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                fontSize: 13,
                color: "var(--neutral-700)",
                background: "transparent",
                border: "1px solid var(--neutral-300)",
                padding: "6px 12px",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Side nav */}
        <nav
          style={{
            width: 220,
            background: "var(--neutral-0)",
            borderRight: "1px solid var(--neutral-200)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <NavLink href="/teacher" label="Overview" />
          <NavLink href="/teacher/roster" label="Roster" />
          <NavLink href="/teacher/sessions" label="Sessions" />
          <NavLink href="/teacher/hints" label="Hints" />
          <NavLink href="/teacher/club" label="Club state" />
          <div style={{ marginTop: 16, fontSize: 11, fontWeight: 600, color: "var(--neutral-500)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Site
          </div>
          <NavLink href="/sessions" label="Public sessions →" />
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: 32, maxWidth: 1280 }}>{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 14,
        color: "var(--neutral-900)",
        textDecoration: "none",
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}
