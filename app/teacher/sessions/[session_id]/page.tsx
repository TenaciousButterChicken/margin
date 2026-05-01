import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, PHASES } from "@/lib/sessions";
import { getSessionAggregate } from "@/lib/teacher/queries";
import { Histogram } from "./Histogram";

export const dynamic = "force-dynamic";

export default async function PerSessionPage({ params }: { params: { session_id: string } }) {
  const meta = getSession(params.session_id);
  if (!meta) notFound();

  const agg = await getSessionAggregate(params.session_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, maxWidth: 1080 }}>
      <div>
        <Link
          href="/teacher/sessions"
          style={{ fontSize: 13, color: "var(--neutral-500)", textDecoration: "none" }}
        >
          ← Sessions
        </Link>
      </div>

      <div>
        <p style={{ fontSize: 12, color: "var(--neutral-500)", margin: 0, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {PHASES[meta.phase - 1].name} · Session {String(meta.n).padStart(2, "0")}
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: "6px 0 0", letterSpacing: "-0.015em" }}>
          {meta.title}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="Visited" value={agg.students_visited} />
        <StatCard label="Completed" value={agg.students_completed} />
        <StatCard label="Avg minutes" value={agg.avg_minutes} />
        <StatCard label="Total minutes" value={agg.total_minutes} />
      </div>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>Time-on-page distribution</h2>
        <Histogram data={agg.histogram} />
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
          Students ({agg.students.length})
        </h2>
        {agg.students.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--neutral-500)" }}>
            Nobody has opened this session yet.
          </p>
        ) : (
          <div
            className="scroll-x"
            style={{
              background: "var(--neutral-0)",
              border: "1px solid var(--neutral-200)",
              borderRadius: 8,
            }}
          >
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--neutral-50)" }}>
                  <Th>Email</Th>
                  <Th align="right">Minutes</Th>
                  <Th>Completed</Th>
                </tr>
              </thead>
              <tbody>
                {agg.students
                  .slice()
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((s) => (
                    <tr key={s.user_id} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                      <Td>
                        <Link
                          href={`/teacher/roster/${s.user_id}`}
                          style={{ color: "var(--neutral-900)", fontWeight: 500, textDecoration: "none" }}
                        >
                          {s.email}
                        </Link>
                      </Td>
                      <Td align="right">{s.minutes}</Td>
                      <Td>
                        {s.completed_at ? (
                          <span style={{ color: "#1e7a3a", fontWeight: 600 }}>✓</span>
                        ) : (
                          <span style={{ color: "var(--neutral-300)" }}>-</span>
                        )}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--neutral-0)", border: "1px solid var(--neutral-200)", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--neutral-500)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "var(--neutral-900)", lineHeight: 1 }}>
        {value}
      </div>
    </div>
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
  return <td style={{ padding: "10px 14px", textAlign: align, fontSize: 13, color: "var(--neutral-900)" }}>{children}</td>;
}
