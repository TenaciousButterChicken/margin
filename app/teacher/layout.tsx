import Link from "next/link";
import { requireTeacher } from "@/lib/teacher/guard";
import { signOut } from "@/app/(auth)/actions";
import { Wordmark } from "@/components/illustrations/Wordmark";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireTeacher();

  return (
    <div className="teacher-shell" style={{ minHeight: "100vh", background: "var(--neutral-50)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "16px var(--page-pad-x)",
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span
            className="hide-mobile"
            style={{ fontSize: 13, color: "var(--neutral-700)" }}
          >
            {profile.email}
          </span>
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

      <div className="teacher-body">
        {/* Side nav - desktop. Mobile gets the horizontal tab strip below. */}
        <nav
          className="teacher-sidenav hide-mobile"
          style={{
            width: 220,
            background: "var(--neutral-0)",
            borderRight: "1px solid var(--neutral-200)",
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: "none",
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

        {/* Mobile tab strip - horizontal scroll under the top bar */}
        <nav
          className="show-mobile-only scroll-x"
          style={{
            display: "flex",
            gap: 4,
            padding: "8px var(--page-pad-x)",
            background: "var(--neutral-0)",
            borderBottom: "1px solid var(--neutral-200)",
          }}
        >
          <TabLink href="/teacher" label="Overview" />
          <TabLink href="/teacher/roster" label="Roster" />
          <TabLink href="/teacher/sessions" label="Sessions" />
          <TabLink href="/teacher/hints" label="Hints" />
          <TabLink href="/teacher/club" label="Club" />
          <TabLink href="/sessions" label="Public →" />
        </nav>

        {/* Main content */}
        <main
          className="teacher-main"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "var(--section-pad-y) var(--page-pad-x)",
            maxWidth: "var(--container-max)",
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        .teacher-body {
          display: flex;
          flex: 1;
          min-height: 0;
        }
        @media (max-width: 640px) {
          .teacher-body {
            flex-direction: column;
          }
          .teacher-main {
            padding: 24px var(--page-pad-x) 48px !important;
          }
        }
      `}</style>
    </div>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        flex: "none",
        padding: "8px 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--neutral-700)",
        background: "var(--neutral-100)",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
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
