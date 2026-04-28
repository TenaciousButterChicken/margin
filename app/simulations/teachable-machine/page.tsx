import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { getCurrentUser } from "@/lib/supabase/server";
import { HowItWorks } from "./HowItWorks";

// TF.js is heavy — dynamic import keeps it off any other route's bundle.
const TeachableMachine = dynamic(
  () => import("@/components/simulations/TeachableMachine").then((m) => m.TeachableMachine),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          aspectRatio: "4 / 3",
          background: "var(--neutral-100)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 12,
          margin: "0 auto",
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

export default async function TeachableMachinePage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!user} current="simulations" />

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
          <span className="t-meta">Phase 1 simulation</span>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            Teachable Machine.
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
            Train an image classifier in your browser. Show the webcam three
            things, label each, and watch the model recognize them in real time.
            About thirty seconds, start to finish.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1024, margin: "0 auto", padding: "16px 24px 48px" }}>
        <TeachableMachine />
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "16px 24px 24px" }}>
        <HowItWorks />
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
            href="https://teachablemachine.withgoogle.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Google&rsquo;s Teachable Machine
          </a>
          . Built using{" "}
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
          🔒 All processing happens in your browser. No images, video, or
          training data ever leave your device.
        </p>
      </footer>
    </main>
  );
}
