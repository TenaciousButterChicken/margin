import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { getCurrentProfile } from "@/lib/auth/profile";

// The math + SVG drawing all live in the client component. Dynamic import
// with ssr:false because the SVG uses pointer events / refs that need a real DOM.
const PolynomialPlayground = dynamic(
  () =>
    import("@/components/simulations/PolynomialPlayground").then(
      (m) => m.PolynomialPlayground
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          background: "var(--neutral-50)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--neutral-500)",
          fontSize: 13,
          fontFamily: "var(--font-mono)",
        }}
      >
        loading the simulation…
      </div>
    ),
  }
);

export default async function PolynomialPlaygroundPage() {
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!profile} email={profile?.email} role={profile?.role} current="simulations" />

      <section style={{ maxWidth: 1024, margin: "0 auto", padding: "48px 24px 24px" }}>
        <Link
          href="/simulations"
          style={{
            fontSize: 13,
            color: "var(--neutral-500)",
            fontFamily: "var(--font-mono)",
            textDecoration: "none",
          }}
        >
          ← back to simulations
        </Link>
        <div style={{ marginTop: 12 }}>
          <span className="t-meta">Phase 2 simulation</span>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            Polynomial Playground.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--neutral-700)",
              margin: 0,
              maxWidth: 640,
            }}
          >
            Drop a few dots. Slide the polynomial degree from 1 to 15. The curve
            morphs in real time, and somewhere around degree 10, you watch
            overfitting happen with your own eyes.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1024, margin: "0 auto", padding: "16px 24px 48px" }}>
        <PolynomialPlayground />
      </section>

      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "24px 24px",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--neutral-700)",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--neutral-900)", margin: "0 0 12px" }}>
          What you&rsquo;re seeing
        </h2>
        <p style={{ margin: "0 0 12px" }}>
          A polynomial of degree <em>d</em> has <em>d</em>+1 coefficients. The more
          coefficients, the more &ldquo;wiggles&rdquo; the curve can have. Ordinary
          least squares finds the coefficients that minimize the squared distance
          from the curve to your dots.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          When the degree is <strong>low</strong>, the curve is too rigid to capture
          real patterns. When the degree is <strong>too high</strong>, the curve
          wiggles to pass through every dot perfectly, including all the noise.
          Training error goes to zero, but the curve has memorized the data instead
          of learning the underlying shape.
        </p>
        <p style={{ margin: 0 }}>
          The sweet spot, the degree that captures the pattern without chasing the
          noise, is what most of machine learning is about. This same principle
          shows up in every model you&rsquo;ll meet: linear regression, neural nets,
          transformers. Same lesson, different scale.
        </p>
      </section>

      <footer
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "32px 24px 64px",
          borderTop: "1px solid var(--neutral-200)",
          fontSize: 13,
          color: "var(--neutral-500)",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0 }}>
          Built for Margin. Inspired by classic statistics demonstrations of the
          bias-variance tradeoff.
        </p>
      </footer>
    </main>
  );
}
