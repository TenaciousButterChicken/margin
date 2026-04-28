import { TopNav } from "@/components/public/TopNav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AboutPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <main style={{ background: "var(--neutral-0)", minHeight: "100vh" }}>
      <TopNav signedIn={!!user} current="about" />

      <article
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "96px 24px 128px",
        }}
      >
        <span className="t-meta">A note from me</span>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "12px 0 32px",
          }}
        >
          Why I built Margin.
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)" }}>
          I&rsquo;m a high school senior. I run our school&rsquo;s machine learning club. Roughly
          sixteen students show up to bi-weekly sessions, voluntarily, because they&rsquo;re curious.
          That&rsquo;s the audience this whole thing is built for.
        </p>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)" }}>
          The courses I learned ML from either skipped the math or skipped the code. The math-heavy
          ones treated the implementation as obvious; the code-heavy ones treated the math as a
          black box. I needed both, in the same window. So I&rsquo;m building both, in the same window.
        </p>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "48px 0 12px",
          }}
        >
          The shape of the thing
        </h2>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)" }}>
          Sixteen sessions across the school year. Each session is a lesson — eight to twelve minutes
          to read — and a Lab, where you write code that runs in your browser, watch a real model
          train, and try to break it on purpose. Pyodide for Python, TensorFlow.js for the networks,
          a small AI tutor that gives you Socratic hints when you&rsquo;re stuck.
        </p>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)" }}>
          No leaderboards. No XP. No streaks. The research is unambiguous on this — heavy
          gamification harms students who are already curious. Margin is built around explorable
          explanations, not arcade mechanics.
        </p>

        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "48px 0 12px",
          }}
        >
          What this page will become
        </h2>

        <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)" }}>
          A real essay, written over the summer as the platform comes together. For now, this is the
          stub — the placeholder that says <em>this thing is being made carefully and on purpose.</em>
        </p>
      </article>
    </main>
  );
}
