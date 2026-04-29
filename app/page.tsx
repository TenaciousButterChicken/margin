import Link from "next/link";
import { TopNav } from "@/components/public/TopNav";
import { SessionCard } from "@/components/public/SessionCard";
import { Wordmark } from "@/components/illustrations/Wordmark";
import FaultyTerminal from "@/components/FaultyTerminal";
import { PHASES, sessionsByPhase } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null);
  const grouped = sessionsByPhase();

  return (
    <main style={{ background: "var(--neutral-0)" }}>
      <TopNav signedIn={!!user} />

      {/* Hero — FaultyTerminal (clay digits on white) as full-width background */}
      <section
        style={{
          position: "relative",
          padding: "120px 56px 160px",
          background: "var(--neutral-0)",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        {/* Animated CRT background, fills the whole section */}
        <div
          aria-hidden
          style={{ position: "absolute", inset: 0, zIndex: 0 }}
        >
          <FaultyTerminal
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={0.5}
            pause={false}
            scanlineIntensity={0.5}
            glitchAmount={1}
            flickerAmount={1}
            noiseAmp={1}
            chromaticAberration={0}
            dither={0}
            curvature={0.1}
            tint="#B5532A"
            background="#FFFFFF"
            mouseReact
            mouseStrength={0.5}
            pageLoadAnimation
            brightness={0.85}
          />
        </div>

        {/* Soft white wash so headline + paragraph sit on a calmer field
            and the busiest digit areas don't fight the type. Sides stay
            fully visible; readability zone gets a gentle mask. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 90% at 30% 50%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.4) 55%, rgba(255,255,255,0) 100%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Foreground content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <span className="t-meta" style={{ color: "var(--accent)" }}>
            16 sessions · self-paced
          </span>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              margin: "12px 0 24px",
              maxWidth: 980,
            }}
          >
            Machine learning,
            <br />
            <span style={{ color: "var(--accent)" }}>by hand,</span> from scratch.
          </h1>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.55,
              color: "var(--neutral-700)",
              margin: 0,
              maxWidth: 600,
              textWrap: "pretty",
            }}
          >
            A 16-session course where every concept lands twice — once in the lesson, once in a Lab where you write code that runs. No black boxes.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>
            <Link href="/sessions/machines-that-learn">
              <button className="btn btn-primary btn-lg">Start with Session 01</button>
            </Link>
            <Link href="/sessions/rolling-downhill">
              <button className="btn btn-secondary btn-lg">
                See Session 06 — gradient descent
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three-promise strip */}
      <section
        style={{
          padding: "56px 56px",
          borderBottom: "1px solid var(--neutral-200)",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 56 }}>
          {[
            {
              kicker: "Lessons that earn their length",
              body: "Plain-language explanations that respect your time. No filler, no cliffhangers, no gamification.",
            },
            {
              kicker: "A Lab in every session",
              body: "Read for 10 minutes, then build for 15. Code runs in your browser — no setup, no environment to break.",
            },
            {
              kicker: "Built by a high school senior in 2026",
              body: "I'm one person. The course is free for now. If it gets popular enough to need infrastructure, that may change.",
            },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: "var(--neutral-900)" }}>
                {c.kicker}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--neutral-700)", margin: 0 }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sessions section header */}
      <section
        style={{
          padding: "88px 56px 24px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div>
          <span className="t-meta">The course</span>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "8px 0 8px",
            }}
          >
            16 sessions, 5 phases.
          </h2>
          <p style={{ fontSize: 16, color: "var(--neutral-500)", margin: 0, maxWidth: 560, lineHeight: 1.55 }}>
            Each session is a lesson and a Lab. They&rsquo;re meant to be done in order, but you can drop in anywhere.
          </p>
        </div>
      </section>

      {/* Sessions grid */}
      <section style={{ padding: "0 56px 96px", maxWidth: 1280, margin: "0 auto" }}>
        {grouped.map(({ phase, name, sessions }, i) => {
          const phaseMeta = PHASES[phase - 1];
          return (
            <div key={phase} style={{ marginBottom: i === grouped.length - 1 ? 0 : 56 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 0",
                  marginBottom: 16,
                  borderBottom: "1px solid var(--neutral-200)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--neutral-500)",
                    letterSpacing: 0.5,
                    width: 56,
                  }}
                >
                  Phase {phase}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "var(--neutral-900)" }}>{name}</span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--neutral-500)",
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Sessions {phaseMeta.sessions}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {sessions.map((s) => (
                  <SessionCard key={s.n} s={s} phaseName={name} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* About teaser */}
      <section
        style={{
          padding: "64px 56px",
          borderTop: "1px solid var(--neutral-200)",
          background: "var(--neutral-50)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="t-meta">A note from me</span>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.55,
              color: "var(--neutral-900)",
              margin: "12px 0 16px",
              fontWeight: 400,
              textWrap: "pretty",
            }}
          >
            I built Margin because the courses I learned from either skipped the math or skipped the code, and I needed both. It&rsquo;s a small, opinionated object that exists because I wanted it to.
          </p>
          <Link
            href="/about"
            style={{
              fontSize: 14,
              color: "var(--accent)",
              fontWeight: 600,
              textDecoration: "none",
              borderBottom: "1px solid var(--accent)",
              paddingBottom: 1,
            }}
          >
            Read the full About →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 56px",
          borderTop: "1px solid var(--neutral-200)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          color: "var(--neutral-500)",
        }}
      >
        <Wordmark size={14} color="var(--neutral-500)" />
        <span style={{ fontFamily: "var(--font-mono)" }}>v0.1 · built by one person</span>
      </footer>
    </main>
  );
}
