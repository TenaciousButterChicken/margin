import { getHintQuotaTable } from "@/lib/teacher/queries";

export const dynamic = "force-dynamic";

const QUOTA = 30; // 30 AI hints per student per calendar month (locked decision)

export default async function HintsPage() {
  const rows = await getHintQuotaTable();
  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  const totalAi = rows.reduce((sum, r) => sum + r.ai_hints_this_month, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.015em" }}>
          AI hint usage
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: "6px 0 0" }}>
          {monthLabel} · {totalAi} AI hints used across the cohort · quota is {QUOTA}/student/month.
        </p>
      </div>

      <div
        style={{
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--neutral-50)" }}>
              <Th>Student</Th>
              <Th align="right">AI hints</Th>
              <Th align="right">All hints</Th>
              <Th>Usage</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--neutral-500)" }}>
                  No accounts yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const pct = Math.min(100, Math.round((r.ai_hints_this_month / QUOTA) * 100));
                const overQuota = r.ai_hints_this_month >= QUOTA;
                return (
                  <tr key={r.user_id} style={{ borderTop: "1px solid var(--neutral-200)" }}>
                    <Td>{r.email}</Td>
                    <Td align="right">
                      <span style={{ color: overQuota ? "var(--danger)" : "var(--neutral-900)", fontWeight: overQuota ? 600 : 400 }}>
                        {r.ai_hints_this_month}/{QUOTA}
                      </span>
                    </Td>
                    <Td align="right">{r.hints_this_month}</Td>
                    <Td>
                      <div
                        style={{
                          position: "relative",
                          height: 8,
                          background: "var(--neutral-100)",
                          borderRadius: 4,
                          overflow: "hidden",
                          minWidth: 160,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${pct}%`,
                            background: overQuota ? "var(--danger)" : "var(--accent)",
                          }}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--neutral-500)", lineHeight: 1.5, margin: 0 }}>
        Note: hardcoded hints don&apos;t count toward the quota. Only AI hints do. The AI hint
        endpoint isn&apos;t wired up yet (it ships with the Lab framework in June), so this page
        stays empty for now.
      </p>
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
