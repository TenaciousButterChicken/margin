import Link from "next/link";
import { sessionsByPhase } from "@/lib/sessions";
import { PhasePip } from "@/components/illustrations/PhasePip";

// Lesson-page sidebar. Per design brief §6.1: 240px expanded, 56px
// collapsed. For v0 we only ship the expanded variant — the side-panel
// Lab transition will introduce the collapsed mode.

export function Sidebar({ currentSlug }: { currentSlug?: string }) {
  const grouped = sessionsByPhase();
  return (
    <aside
      style={{
        width: 240,
        flex: "none",
        borderRight: "1px solid var(--neutral-200)",
        background: "var(--neutral-50)",
        padding: "24px 16px",
        overflow: "auto",
      }}
    >
      {grouped.map(({ phase, name, sessions }) => (
        <div key={phase} style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              marginBottom: 4,
              color: "var(--neutral-500)",
            }}
          >
            <span style={{ color: "var(--neutral-700)", display: "inline-flex" }}>
              <PhasePip phase={phase} size={14} />
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Phase {phase} · {name}
            </span>
          </div>
          {sessions.map((s) => {
            const active = s.slug === currentSlug;
            return (
              <Link
                key={s.n}
                href={`/sessions/${s.slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  marginBottom: 1,
                  borderRadius: 6,
                  background: active ? "var(--neutral-0)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px var(--neutral-200)" : "none",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    width: 20,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: active ? "var(--accent)" : "var(--neutral-400)",
                    fontWeight: 600,
                    textAlign: "center",
                    flex: "none",
                  }}
                >
                  {String(s.n).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--neutral-900)" : "var(--neutral-700)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
