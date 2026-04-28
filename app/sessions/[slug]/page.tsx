import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { TopNav } from "@/components/public/TopNav";
import { Sidebar } from "@/components/public/Sidebar";
import { PHASE_HEADERS } from "@/components/illustrations/phase-headers";
import { Motif } from "@/components/illustrations/motifs";
import { getSession, SESSIONS, PHASES } from "@/lib/sessions";
import { lessonMdxComponents } from "@/lib/mdx/components";
import { loadSessionNotes } from "@/lib/mdx/loader";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamicParams = false;

export async function generateStaticParams() {
  return SESSIONS.map((s) => ({ slug: s.slug }));
}

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const session = getSession(params.slug);
  if (!session) notFound();

  const user = await getCurrentUser().catch(() => null);
  const PhaseHeader = PHASE_HEADERS[session.phase];
  const phaseName = PHASES[session.phase - 1].name;
  const notes = await loadSessionNotes(session.slug);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--neutral-0)",
      }}
    >
      <TopNav signedIn={!!user} current="sessions" />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar currentSlug={session.slug} />

        <main style={{ flex: 1, overflow: "auto", padding: "0 64px", position: "relative" }}>
          <article style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 96 }}>
            <div style={{ marginBottom: 40, marginTop: 24 }}>
              <PhaseHeader width={260} />
            </div>

            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <span className="t-meta">
                Phase {session.phase} · Session {String(session.n).padStart(2, "0")} · {session.estimatedMinutes} min
              </span>
            </div>

            <h1
              style={{
                fontSize: 36,
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: "-0.015em",
                margin: "0 0 24px",
              }}
            >
              {session.title}
            </h1>

            {notes ? (
              <MDXRemote source={notes} components={lessonMdxComponents} />
            ) : (
              <PlaceholderNotes phaseName={phaseName} />
            )}
          </article>

          {/* Open Lab affordance — sticky at the bottom of the viewport */}
          <div
            style={{
              position: "sticky",
              bottom: 24,
              display: "flex",
              justifyContent: "flex-end",
              pointerEvents: "none",
            }}
          >
            <OpenLabCard session={session} />
          </div>
        </main>
      </div>
    </div>
  );
}

function PlaceholderNotes({ phaseName }: { phaseName: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)", margin: 0 }}>
        Lesson notes for this session are still being written. The {phaseName} phase covers this
        material — for now, the lesson outline is available in the master plan.
      </p>
      <p style={{ fontSize: 14, color: "var(--neutral-500)", margin: 0 }}>
        Once notes ship, this page renders the MDX file at
        <code className="code-inline" style={{ margin: "0 4px" }}>content/sessions/&lt;slug&gt;/notes.mdx</code>.
      </p>
    </div>
  );
}

function OpenLabCard({ session }: { session: ReturnType<typeof getSession> }) {
  if (!session) return null;
  return (
    <div
      style={{
        pointerEvents: "auto",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "var(--shadow-modal)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 320,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: "var(--accent-subtle)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {session.motif && <Motif kind={session.motif} size={28} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--neutral-900)" }}>
            {session.title}
          </span>
          <span style={{ fontSize: 12, color: "var(--neutral-500)" }}>
            Lab activity · ~{session.estimatedMinutes} min
          </span>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--neutral-700)", margin: 0 }}>
        The Lab framework lands in June. For now, this affordance shows where the side-panel will mount.
      </p>
      <button
        className="btn btn-secondary"
        style={{ width: "100%", cursor: "not-allowed", opacity: 0.7 }}
        disabled
      >
        Open Lab — coming soon
      </button>
    </div>
  );
}
