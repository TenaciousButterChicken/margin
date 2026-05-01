import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Wordmark } from "@/components/illustrations/Wordmark";
import { getPhaseBySlug, PHASES } from "@/lib/sessions";

const LabRoot = dynamic(
  () => import("@/components/lab/LabRoot").then((m) => m.LabRoot),
  { ssr: false }
);

export const dynamicParams = false;

export async function generateStaticParams() {
  return PHASES.filter((p) => p.lab).map((p) => ({ slug: p.slug }));
}

export default function PhaseLabPage({ params }: { params: { slug: string } }) {
  const phase = getPhaseBySlug(params.slug);
  if (!phase || !phase.lab) notFound();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--neutral-0)",
      }}
    >
      <div className="topnav">
        <Link href="/" aria-label="Margin home" style={{ textDecoration: "none" }}>
          <Wordmark size={17} />
        </Link>
        <Link
          href="/sessions"
          style={{
            marginLeft: 16,
            fontSize: 13,
            color: "var(--neutral-500)",
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ← back
        </Link>
        <span
          className="hide-mobile"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--neutral-400)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Lab · {phase.name}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <LabRoot phaseSlug={phase.slug} />
      </div>
    </div>
  );
}
