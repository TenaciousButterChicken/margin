import Link from "next/link";
import { getRoster } from "@/lib/teacher/queries";
import { approveStudent, rejectStudent, approveAllPending } from "../actions";
import { isAdmin } from "@/lib/auth/profile";
import { RoleCell } from "@/components/public/RoleCell";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const all = await getRoster();
  const filter = searchParams.filter ?? "all";
  const rows = filter === "pending"
    ? all.filter((r) => r.status === "pending")
    : filter === "approved"
    ? all.filter((r) => r.status === "approved")
    : filter === "rejected"
    ? all.filter((r) => r.status === "rejected")
    : all;

  const pendingCount = all.filter((r) => r.status === "pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>
            Roster
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
            {all.length} total · {pendingCount} pending
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href="/api/teacher/roster.csv"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--neutral-700)",
              background: "transparent",
              border: "1px solid var(--neutral-300)",
              padding: "10px 14px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Export CSV
          </a>
          {pendingCount > 0 && (
            <form action={approveAllPending}>
              <button
                type="submit"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--neutral-0)",
                  background: "var(--accent)",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Approve all {pendingCount} pending
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6 }}>
        <FilterPill label={`All (${all.length})`} active={filter === "all"} href="/teacher/roster" />
        <FilterPill
          label={`Pending (${pendingCount})`}
          active={filter === "pending"}
          href="/teacher/roster?filter=pending"
        />
        <FilterPill
          label="Approved"
          active={filter === "approved"}
          href="/teacher/roster?filter=approved"
        />
        <FilterPill
          label="Rejected"
          active={filter === "rejected"}
          href="/teacher/roster?filter=rejected"
        />
      </div>

      <div
        style={{
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--neutral-50)" }}>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th>Cohort</Th>
              <Th align="right">Sessions</Th>
              <Th align="right">Minutes</Th>
              <Th>Last seen</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--neutral-500)" }}>
                  No students match this filter.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                  <Td>
                    <Link
                      href={`/teacher/roster/${r.id}`}
                      style={{ color: "var(--neutral-900)", textDecoration: "none", fontWeight: 500 }}
                    >
                      {r.email}
                    </Link>
                  </Td>
                  <Td><StatusPill status={r.status} /></Td>
                  <Td>
                    <RoleCell userId={r.id} initialRole={r.role} />
                  </Td>
                  <Td>{r.cohort_year}</Td>
                  <Td align="right">{r.sessions_completed}/16</Td>
                  <Td align="right">{r.total_minutes}</Td>
                  <Td>
                    <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
                      {r.last_seen ? timeAgo(r.last_seen) : "-"}
                    </span>
                  </Td>
                  <Td>
                    {r.status === "pending" && !isAdmin(r.role) && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <ApproveButton userId={r.id} />
                        <RejectButton userId={r.id} />
                      </div>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPill({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13,
        fontWeight: 500,
        padding: "6px 12px",
        borderRadius: 999,
        textDecoration: "none",
        color: active ? "var(--neutral-0)" : "var(--neutral-700)",
        background: active ? "var(--neutral-900)" : "var(--neutral-100)",
        border: active ? "none" : "1px solid var(--neutral-200)",
      }}
    >
      {label}
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "var(--accent-subtle)", fg: "var(--accent)" },
    approved: { bg: "#e6f4ea", fg: "#1e7a3a" },
    rejected: { bg: "var(--neutral-100)", fg: "var(--neutral-700)" },
  };
  const c = colorMap[status] ?? colorMap.rejected;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status}
    </span>
  );
}

function ApproveButton({ userId }: { userId: string }) {
  return (
    <form action={approveStudent.bind(null, userId)} style={{ display: "inline" }}>
      <button
        type="submit"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--neutral-0)",
          background: "var(--accent)",
          border: "none",
          padding: "6px 10px",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Approve
      </button>
    </form>
  );
}

function RejectButton({ userId }: { userId: string }) {
  return (
    <form action={rejectStudent.bind(null, userId)} style={{ display: "inline" }}>
      <button
        type="submit"
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--neutral-700)",
          background: "transparent",
          border: "1px solid var(--neutral-300)",
          padding: "6px 10px",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Reject
      </button>
    </form>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: align,
        fontSize: 11,
        fontWeight: 600,
        color: "var(--neutral-500)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td style={{ padding: "12px 14px", textAlign: align, fontSize: 14, color: "var(--neutral-900)" }}>{children}</td>;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
