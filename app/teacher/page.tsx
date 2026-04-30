import Link from "next/link";
import { getOverviewStats, getRoster } from "@/lib/teacher/queries";

export const dynamic = "force-dynamic";

export default async function TeacherOverviewPage() {
  const [stats, roster] = await Promise.all([getOverviewStats(), getRoster()]);
  const recent = roster
    .filter((r) => r.last_seen)
    .sort((a, b) => (b.last_seen! > a.last_seen! ? 1 : -1))
    .slice(0, 8);

  const avgMinutesPerStudent =
    stats.approved_students > 0
      ? Math.round(stats.total_minutes_cohort / stats.approved_students)
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>
          Overview
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
          Quick snapshot of who&apos;s in the club and what they&apos;re up to.
        </p>
      </div>

      {/* Cohort cards */}
      <section>
        <SectionLabel>Cohort</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard label="Approved" value={stats.approved_students} />
          <StatCard label="Pending" value={stats.pending} accent={stats.pending > 0} />
          <StatCard label="Rejected" value={stats.rejected} muted />
          <StatCard label="Active this week" value={stats.active_this_week} />
        </div>
      </section>

      {/* Engagement cards */}
      <section>
        <SectionLabel>Engagement</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard label="Total minutes" value={stats.total_minutes_cohort} />
          <StatCard label="Avg min/student" value={avgMinutesPerStudent} />
          <StatCard label="Sessions completed" value={stats.sessions_completed_cohort} />
          <StatCard label="Lab attempts" value={stats.lab_attempts_total} />
          <StatCard label="AI hints (month)" value={stats.hints_this_month} />
        </div>
      </section>

      {/* Pending banner */}
      {stats.pending > 0 && (
        <div
          style={{
            padding: 16,
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
            {stats.pending} {stats.pending === 1 ? "student is" : "students are"} waiting for approval.
          </span>
          <Link
            href="/teacher/roster?filter=pending"
            style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}
          >
            Review →
          </Link>
        </div>
      )}

      {/* Recent activity */}
      <section>
        <SectionLabel>Recently active</SectionLabel>
        {recent.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--neutral-500)" }}>
            No activity yet. Once students start opening sessions, they&apos;ll show up here.
          </p>
        ) : (
          <div
            style={{
              background: "var(--neutral-0)",
              border: "1px solid var(--neutral-200)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {recent.map((r, i) => (
              <Link
                key={r.id}
                href={`/teacher/roster/${r.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "12px 16px",
                  borderTop: i === 0 ? "none" : "1px solid var(--neutral-200)",
                  textDecoration: "none",
                  color: "var(--neutral-900)",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.email}</span>
                <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
                  {r.sessions_completed}/16 sessions · {r.total_minutes} min
                </span>
                <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
                  {timeAgo(r.last_seen!)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--neutral-500)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        margin: "0 0 12px",
      }}
    >
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  const borderColor = accent ? "var(--accent)" : "var(--neutral-200)";
  const valueColor = accent
    ? "var(--accent)"
    : muted
    ? "var(--neutral-500)"
    : "var(--neutral-900)";
  return (
    <div
      style={{
        background: "var(--neutral-0)",
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--neutral-500)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: valueColor, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
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
