import dynamic from "next/dynamic";
import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { getCurrentUser } from "@/lib/supabase/server";

const TransformerExplorer = dynamic(
  () =>
    import("@/components/simulations/TransformerExplorer").then(
      (m) => m.TransformerExplorer
    ),
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

export default async function TransformerExplorerPage() {
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
          <span className="t-meta">Phase 5 simulation</span>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            Transformer Explorer.
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--neutral-700)",
              margin: 0,
              maxWidth: 720,
            }}
          >
            Type a sentence and watch a real GPT-2 small process it inside
            your browser. See how text gets broken into tokens, watch
            attention flow between them across the model&rsquo;s 12 layers and
            12 heads, and click <strong>Generate next token</strong> to grow
            the sentence one piece at a time.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px 48px" }}>
        <TransformerExplorer />
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
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--neutral-900)",
            margin: "0 0 12px",
          }}
        >
          What you&rsquo;re seeing
        </h2>
        <p style={{ margin: "0 0 12px" }}>
          A transformer language model doesn&rsquo;t see characters or words.
          It sees <em>tokens</em>: chunks of text from a fixed vocabulary
          of about 50,000 entries. The first row shows your sentence after
          GPT-2&rsquo;s byte-pair tokenizer has done its work, including the
          numeric ID each token has in the vocabulary.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          Each layer of GPT-2 has twelve <em>attention heads</em>, and each
          head decides, for every token, how much to look at every other
          token. The bipartite graph shows one head&rsquo;s attention map at a
          time: line opacity is the attention weight from a token on the
          left to a token on the right. Different heads pick up different
          patterns; middle layers tend to be the most visually rich.
        </p>
        <p style={{ margin: 0 }}>
          The bar chart is what GPT-2 thinks the next token should be.
          Temperature reshapes the same logits: low temperature is
          confident, high temperature is chaotic. Click Generate to sample
          a token from that distribution and watch the model continue.
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
            href="https://poloclub.github.io/transformer-explainer/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Cho et al.&rsquo;s Transformer Explainer
          </a>{" "}
          (Polo Club, Georgia Tech). Built using{" "}
          <a
            href="https://huggingface.co/docs/transformers.js"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            ONNX Runtime Web (via transformers.js)
          </a>{" "}
          and GPT-2 small (OpenAI, 2019).
        </p>
        <p style={{ margin: "8px 0 0" }}>
          🔒 All processing happens in your browser. No text leaves your device.
        </p>
      </footer>
    </main>
  );
}
