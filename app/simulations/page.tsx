import { TopNav } from "@/components/public/TopNav";
import { SimulationCard } from "@/components/public/SimulationCard";
import { SIMULATIONS } from "@/lib/simulations";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function SimulationsIndexPage() {
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!profile} email={profile?.email} role={profile?.role} current="simulations" />

      <section
        style={{
          padding: "var(--section-pad-y) var(--page-pad-x) 24px",
          maxWidth: "var(--container-max)",
          margin: "0 auto",
        }}
      >
        <span className="t-meta">Standalone playgrounds</span>
        <h1
          style={{
            fontSize: "var(--section-h2)",
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "8px 0 8px",
          }}
        >
          Simulations.
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "var(--neutral-500)",
            margin: 0,
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          Standalone interactive playgrounds, each focused on one ML idea.
          They&rsquo;re separate from the 16-session journey: no progression, no
          challenges, just open-ended exploration.
        </p>
      </section>

      <section
        style={{
          padding: "32px var(--page-pad-x) var(--section-pad-y-lg)",
          maxWidth: "var(--container-max)",
          margin: "0 auto",
        }}
      >
        <div className="lp-grid-auto-320">
          {SIMULATIONS.map((sim) => (
            <SimulationCard key={sim.slug} sim={sim} />
          ))}
        </div>
      </section>
    </main>
  );
}
