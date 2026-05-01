import Link from "next/link";
import { SESSIONS, PHASES } from "@/lib/sessions";
import { getAllSessionAggregates, getOverviewStats } from "@/lib/teacher/queries";

export const dynamic = "force-dynamic";

export default async function TeacherSessionsPage() {
  const [aggregates, stats] = await Promise.all([
    getAllSessionAggregates(),
    getOverviewStats(),
  ]);
  const cohort = stats.approved_members;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>
          Sessions
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
          Aggregate progress across all 16 sessions
          ({cohort} approved {cohort === 1 ? "member" : "members"}).
        </p>
      </div>

      <div
        className="scroll-x"
        style={{
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 8,
        }}
      >
        <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--neutral-50)" }}>
              <Th>#</Th>
              <Th>Phase</Th>
              <Th>Title</Th>
              <Th align="right">Visited</Th>
              <Th align="right">Completed</Th>
              <Th align="right">Avg min</Th>
            </tr>
          </thead>
          <tbody>
            {SESSIONS.map((s) => {
              const agg = aggregates.get(s.slug);
              const completed = agg?.students_completed ?? 0;
              return (
                <tr key={s.slug} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                  <Td>{String(s.n).padStart(2, "0")}</Td>
                  <Td>
                    <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
                      {PHASES[s.phase - 1].name}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/teacher/sessions/${s.slug}`}
                      style={{ color: "var(--neutral-900)", fontWeight: 500, textDecoration: "none" }}
                    >
                      {s.title}
                    </Link>
                  </Td>
                  <Td align="right">{agg?.students_visited ?? 0}</Td>
                  <Td align="right">{completed}</Td>
                  <Td align="right">{agg?.avg_minutes ?? 0}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
