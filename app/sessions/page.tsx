import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { SessionCard } from "@/components/public/SessionCard";
import { PHASES, sessionsByPhase } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function SessionsIndexPage() {
  const user = await getCurrentUser().catch(() => null);
  const grouped = sessionsByPhase();

  return (
    <main style={{ background: "var(--neutral-0)" }}>
      <TopNav signedIn={!!user} current="sessions" />

      <section
        style={{
          padding: "64px 56px 24px",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <span className="t-meta">The course</span>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "8px 0 8px",
          }}
        >
          16 sessions, 5 phases.
        </h1>
        <p style={{ fontSize: 16, color: "var(--neutral-500)", margin: 0, maxWidth: 560, lineHeight: 1.55 }}>
          Each session is a lesson and a Lab. Drop in anywhere.
        </p>
      </section>

      <section style={{ padding: "32px 56px 96px", maxWidth: 1280, margin: "0 auto" }}>
        {grouped.map(({ phase, slug, name, sessions, lab }, i) => {
          const phaseMeta = PHASES[phase - 1];
          return (
            <div key={phase} style={{ marginBottom: i === grouped.length - 1 ? 0 : 56 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 0",
                  marginBottom: 16,
                  borderBottom: "1px solid var(--neutral-200)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--neutral-500)",
                    letterSpacing: 0.5,
                    width: 56,
                  }}
                >
                  Phase {phase}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>{name}</span>

                {lab ? (
                  <Link
                    href={`/phases/${slug}/lab`}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--accent)",
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Open Lab →
                  </Link>
                ) : (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--neutral-200)",
                      color: "var(--neutral-400)",
                      fontSize: 12,
                      fontStyle: "italic",
                    }}
                  >
                    Lab - coming soon
                  </span>
                )}

                <span
                  style={{
                    fontSize: 13,
                    color: "var(--neutral-500)",
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Sessions {phaseMeta.sessions}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {sessions.map((s) => (
                  <SessionCard key={s.n} s={s} phaseName={name} />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
