import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { TopNav } from "@/components/public/TopNav";
import { PHASE_HEADERS } from "@/components/illustrations/phase-headers";
import { getSession, SESSIONS, PHASES } from "@/lib/sessions";
import { lessonMdxComponents } from "@/lib/mdx/components";
import { loadSessionNotes } from "@/lib/mdx/loader";
import { getCurrentUser } from "@/lib/supabase/server";
import { LessonShell, PlaceholderCard } from "./LessonShell";

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

  // Sprint 1 only ships Session 6's lab. Other sessions still show
  // the lesson but with a "coming soon" affordance.
  const hasLab = session.slug === "rolling-downhill";

  const notesNode = (
    <article style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 96, paddingTop: 0 }}>
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
        <MDXRemote
          source={notes}
          components={lessonMdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)", margin: 0 }}>
            Lesson notes for this session are still being written. The {phaseName} phase covers this
            material — for now, the lesson outline is available in the master plan.
          </p>
        </div>
      )}

      {!hasLab && (
        <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
          <PlaceholderCard session={session} />
        </div>
      )}
    </article>
  );

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
      <LessonShell session={session} notesNode={notesNode} hasLab={hasLab} />
    </div>
  );
}
