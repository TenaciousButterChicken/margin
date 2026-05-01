import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/teacher/queries";
import { SESSIONS } from "@/lib/sessions";
import { approveStudent, rejectStudent } from "../../actions";
import { PerSessionMinutesChart, DailyActivityChart } from "./StudentCharts";
import { isAdmin, ROLE_LABEL } from "@/lib/auth/profile";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: { user_id: string } }) {
  const detail = await getStudentDetail(params.user_id);
  if (!detail) notFound();

  const { profile, sessions, lab_attempts, hints, daily_activity } = detail;
  const sessionMap = new Map(sessions.map((s) => [s.session_id, s]));

  // Roll-up stats
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.round(s.total_seconds / 60), 0);
  const sessionsStarted = sessions.length;
  const sessionsCompleted = sessions.filter((s) => s.completed_at).length;
  const labsCompleted = lab_attempts.filter((a) => a.outcome === "completed").length;
  const avgMinutesPerSession = sessionsStarted > 0 ? Math.round(totalMinutes / sessionsStarted) : 0;

  // Build per-session bar data
  const perSession = SESSIONS.map((s) => {
    const data = sessionMap.get(s.slug);
    return {
      n: s.n,
      slug: s.slug,
      title: s.title,
      minutes: data ? Math.round(data.total_seconds / 60) : 0,
      completed: !!data?.completed_at,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 1080 }}>
      <div>
        <Link
          href="/teacher/roster"
          style={{ fontSize: 13, color: "var(--neutral-500)", textDecoration: "none" }}
        >
          ← Roster
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em", overflowWrap: "anywhere" }}>
            {profile.full_name || profile.email}
          </h1>
          <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0", overflowWrap: "anywhere" }}>
            {profile.email} · cohort {profile.cohort_year} · status {profile.status} · role {ROLE_LABEL[profile.role]}
          </p>
        </div>
        {profile.status === "pending" && !isAdmin(profile.role) && (
          <div style={{ display: "flex", gap: 8 }}>
            <form action={approveStudent.bind(null, profile.id)}>
              <button
                type="submit"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--neutral-0)",
                  background: "var(--accent)",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Approve
              </button>
            </form>
            <form action={rejectStudent.bind(null, profile.id)}>
              <button
                type="submit"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--neutral-700)",
                  background: "transparent",
                  border: "1px solid var(--neutral-300)",
                  padding: "8px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <StatCard label="Total minutes" value={totalMinutes} />
        <StatCard label="Sessions started" value={sessionsStarted} />
        <StatCard label="Sessions completed" value={sessionsCompleted} />
        <StatCard label="Labs completed" value={labsCompleted} />
        <StatCard label="Avg min/session" value={avgMinutesPerSession} />
      </div>

      {/* Charts */}
      <PerSessionMinutesChart data={perSession} />
      <DailyActivityChart data={daily_activity} />

      {/* Sessions table */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Sessions detail</h2>
        <div
          className="scroll-x"
          style={{
            background: "var(--neutral-0)",
            border: "1px solid var(--neutral-200)",
            borderRadius: 8,
          }}
        >
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--neutral-50)" }}>
                <Th>#</Th>
                <Th>Title</Th>
                <Th align="right">Minutes</Th>
                <Th>Completed</Th>
                <Th>Last seen</Th>
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s) => {
                const data = sessionMap.get(s.slug);
                return (
                  <tr key={s.slug} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                    <Td>{String(s.n).padStart(2, "0")}</Td>
                    <Td>
                      <Link
                        href={`/teacher/sessions/${s.slug}`}
                        style={{ color: "var(--neutral-900)", textDecoration: "none" }}
                      >
                        {s.title}
                      </Link>
                    </Td>
                    <Td align="right">{data ? Math.round(data.total_seconds / 60) : 0}</Td>
                    <Td>
                      {data?.completed_at ? (
                        <span style={{ color: "#1e7a3a", fontWeight: 600 }}>✓</span>
                      ) : (
                        <span style={{ color: "var(--neutral-300)" }}>-</span>
                      )}
                    </Td>
                    <Td>
                      <span style={{ color: "var(--neutral-500)", fontSize: 12 }}>
                        {data?.last_visited_at ? timeAgo(data.last_visited_at) : "-"}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lab attempts */}
      {lab_attempts.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
            Lab attempts ({lab_attempts.length})
          </h2>
          <div className="scroll-x" style={{ background: "var(--neutral-0)", border: "1px solid var(--neutral-200)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--neutral-50)" }}>
                  <Th>Lab</Th>
                  <Th>Outcome</Th>
                  <Th>Started</Th>
                  <Th>Ended</Th>
                </tr>
              </thead>
              <tbody>
                {lab_attempts.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                    <Td>{a.lab_id}</Td>
                    <Td>
                      <span style={{ fontWeight: 600, color: outcomeColor(a.outcome) }}>{a.outcome}</span>
                    </Td>
                    <Td>{new Date(a.started_at).toLocaleString()}</Td>
                    <Td>{a.ended_at ? new Date(a.ended_at).toLocaleString() : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Hint history */}
      {hints.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Hints used ({hints.length})</h2>
          <div className="scroll-x" style={{ background: "var(--neutral-0)", border: "1px solid var(--neutral-200)", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--neutral-50)" }}>
                  <Th>When</Th>
                  <Th>Type</Th>
                  <Th>Where</Th>
                  <Th>Prompt</Th>
                </tr>
              </thead>
              <tbody>
                {hints.map((h) => (
                  <tr key={h.id} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                    <Td>{timeAgo(h.requested_at)}</Td>
                    <Td>{h.hint_type}</Td>
                    <Td>{h.lab_id ?? h.session_id ?? "-"}</Td>
                    <Td>
                      <span style={{ color: "var(--neutral-700)", fontSize: 12 }}>{h.prompt ?? "-"}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--neutral-0)", border: "1px solid var(--neutral-200)", borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--neutral-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--neutral-900)", lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function outcomeColor(o: string): string {
  if (o === "completed") return "#1e7a3a";
  if (o === "abandoned") return "var(--neutral-500)";
  return "var(--accent)";
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
  return <td style={{ padding: "10px 14px", textAlign: align, fontSize: 13, color: "var(--neutral-900)" }}>{children}</td>;
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
