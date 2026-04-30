import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { getCurrentProfile } from "@/lib/auth/profile";

// Canvas + SVG everything - needs the DOM, no SSR.
const NeuralNetPlayground = dynamic(
  () =>
    import("@/components/simulations/NeuralNetPlayground").then(
      (m) => m.NeuralNetPlayground
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: 480,
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

export default async function NeuralNetPlaygroundPage() {
  const profile = await getCurrentProfile().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!profile} email={profile?.email} role={profile?.role} current="simulations" />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px 24px" }}>
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
          <span className="t-meta">Phase 3 simulation</span>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            Neural Net Playground.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--neutral-700)",
              margin: 0,
              maxWidth: 680,
            }}
          >
            Train a small neural network on a 2D classification problem and
            watch the decision boundary form, frame by frame. Each hidden
            neuron also shows what shape it has individually learned, and that&rsquo;s
            usually the most interesting part.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px 48px" }}>
        <NeuralNetPlayground />
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
          The plot on the left shows a 2D dataset and a colored background. That
          background is the network&rsquo;s prediction at every point in space. Orange
          regions are where it predicts class &minus;1, blue regions are class +1.
          Soft = uncertain, saturated = confident.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The diagram on the right is the network. Each circle is a neuron; each
          line is a weight. Line thickness encodes magnitude, color encodes sign.
          Inside each hidden neuron is a tiny version of that neuron&rsquo;s output
          across the input space, so you can see what shape that one neuron has
          learned to detect.
        </p>
        <p style={{ margin: 0 }}>
          The point of stacking layers: a first-layer neuron usually learns a
          half-plane (something like &ldquo;is the input above this line?&rdquo;).
          A second-layer neuron combines those into more interesting shapes.
          Watching that build, layer by layer, is why depth matters.
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
          Inspired by{" "}
          <a
            href="https://playground.tensorflow.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Daniel Smilkov and Shan Carter&rsquo;s TensorFlow Playground
          </a>{" "}
          (Apache 2.0). Math rebuilt natively for Margin in TypeScript, with no
          TF.js dependency for this page.
        </p>
      </footer>
    </main>
  );
}
