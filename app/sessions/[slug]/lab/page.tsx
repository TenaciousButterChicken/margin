import { notFound } from "next/navigation";
import Link from "next/link";
import { LabRoot } from "@/components/lab/LabRoot";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { getSession, SESSIONS } from "@/lib/sessions";

export const dynamicParams = false;

export async function generateStaticParams() {
  // Sprint 1 only ships Session 6's lab. Other slugs 404 here.
  return SESSIONS.filter((s) => s.slug === "rolling-downhill").map((s) => ({ slug: s.slug }));
}

export default function StandaloneLabPage({ params }: { params: { slug: string } }) {
  const session = getSession(params.slug);
  if (!session || session.slug !== "rolling-downhill") notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--neutral-0)" }}>
      <div className="topnav" style={{ padding: "0 24px" }}>
        <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
          <Wordmark size={17} />
        </Link>
        <Link
          href={`/sessions/${session.slug}`}
          style={{
            marginLeft: 24,
            fontSize: 13,
            color: "var(--neutral-500)",
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
          }}
        >
          ← back to lesson
        </Link>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--neutral-400)", fontFamily: "var(--font-mono)" }}>
          Lab · standalone
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <LabRoot sessionN={session.n} title="The hiker's descent" />
      </div>
    </div>
  );
}
