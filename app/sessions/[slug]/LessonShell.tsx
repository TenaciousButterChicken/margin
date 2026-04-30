import { Sidebar } from "@/components/public/Sidebar";
import { type SessionMeta } from "@/lib/sessions";

// Wraps the lesson notes (server-rendered MDX, passed in as `notesNode`)
// alongside the per-phase Sidebar. Labs live at /phases/[slug]/lab,
// not inside session pages.

export function LessonShell({
  session,
  notesNode,
}: {
  session: SessionMeta;
  notesNode: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <Sidebar currentSlug={session.slug} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main style={{ flex: 1, overflow: "auto", padding: "0 64px" }}>
          {notesNode}
        </main>
      </div>
    </div>
  );
}
