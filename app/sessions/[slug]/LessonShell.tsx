import { Sidebar } from "@/components/public/Sidebar";
import { SidebarDrawer } from "@/components/public/SidebarDrawer";
import { type SessionMeta } from "@/lib/sessions";

// Wraps the lesson notes (server-rendered MDX, passed in as `notesNode`)
// alongside the per-phase Sidebar. Labs live at /phases/[slug]/lab,
// not inside session pages.
//
// Mobile behavior: the Sidebar is hidden behind a "Sessions" button that
// opens an off-canvas drawer (see SidebarDrawer + globals.css).

export function LessonShell({
  session,
  notesNode,
}: {
  session: SessionMeta;
  notesNode: React.ReactNode;
}) {
  return (
    <div className="lesson-shell">
      <SidebarDrawer>
        <Sidebar currentSlug={session.slug} />
      </SidebarDrawer>
      <div className="lesson-shell-content">
        <main className="lesson-main">{notesNode}</main>
      </div>
    </div>
  );
}
