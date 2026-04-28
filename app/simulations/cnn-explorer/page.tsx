import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { getCurrentUser } from "@/lib/supabase/server";

const CnnExplorer = dynamic(
  () => import("@/components/simulations/CnnExplorer").then((m) => m.CnnExplorer),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          minHeight: 480,
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

export default async function CnnExplorerPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!user} current="simulations" />

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
          <span className="t-meta">Phase 4 simulation</span>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            CNN Explorer.
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
            See how convolutional networks see images. <strong>Filter Lab</strong>{" "}
            lets you build a 3×3 kernel by hand and watch what it does to a
            small image, one pixel at a time.{" "}
            <strong>Layer Explorer</strong> runs a real pretrained MobileNet on
            a preset image and shows what each of its layers is responding to.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px 48px" }}>
        <CnnExplorer />
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
          A convolution slides a small grid of numbers (a <em>kernel</em>) across
          an image, multiplying and summing as it goes. Different kernels detect
          different things — edges, blurs, sharpenings — without anyone training
          them. The math is small. Filter Lab lets you write the kernel yourself
          and hover any output pixel to see the nine multiplications that produced it.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          A convolutional <em>network</em> stacks dozens of these, with the
          kernels learned from data instead of hand-written. Early layers tend
          to learn edge-like patterns. Middle layers combine those into textures
          and parts. Late layers respond to entire shapes — a face, a cat, a
          car. Layer Explorer shows you those activations at four representative
          depths in a real pretrained model.
        </p>
        <p style={{ margin: 0 }}>
          The classification at the bottom is whatever MobileNet itself thinks
          your image is — including the surprises. Synthetic images often
          confuse it amusingly.
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
            href="https://poloclub.github.io/cnn-explainer/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Wang et al.&rsquo;s CNN Explainer
          </a>{" "}
          (Polo Club, Georgia Tech). Built using{" "}
          <a
            href="https://www.tensorflow.org/js"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            TensorFlow.js
          </a>
          .
        </p>
        <p style={{ margin: "8px 0 0" }}>
          🔒 All processing happens in your browser. No images leave your device.
        </p>
      </footer>
    </main>
  );
}
