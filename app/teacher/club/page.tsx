import { SESSIONS, PHASES } from "@/lib/sessions";
import { getCurrentSessionSlug } from "@/lib/club/state";
import { setCurrentSession } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClubStatePage() {
  const currentSlug = await getCurrentSessionSlug();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.015em",
          }}
        >
          Club state
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--neutral-500)",
            margin: "6px 0 0",
          }}
        >
          Pick the session you&apos;re currently teaching. It gets highlighted on
          the public /sessions page and the lesson sidebar so students always
          know what&apos;s next.
        </p>
      </div>

      <form
        action={setCurrentSession}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 20,
          background: "var(--neutral-0)",
          border: "1px solid var(--neutral-200)",
          borderRadius: 8,
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--neutral-500)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Current session
          </span>
          <select
            name="slug"
            defaultValue={currentSlug ?? ""}
            style={{
              fontSize: 14,
              fontFamily: "inherit",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid var(--neutral-300)",
              background: "var(--neutral-0)",
              color: "var(--neutral-900)",
            }}
          >
            <option value="">(none - no session highlighted)</option>
            {SESSIONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {String(s.n).padStart(2, "0")} · {PHASES[s.phase - 1].name} ·{" "}
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="submit"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--neutral-0)",
              background: "var(--accent)",
              border: "none",
              padding: "10px 16px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </form>

      {currentSlug && (
        <div
          style={{
            padding: 14,
            background: "var(--accent-subtle)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--neutral-900)",
          }}
        >
          <strong>Live now:</strong>{" "}
          {SESSIONS.find((s) => s.slug === currentSlug)?.title ?? currentSlug}.
          Visible to students on{" "}
          <a
            href="/sessions"
            style={{ color: "var(--accent)", fontWeight: 600 }}
          >
            /sessions
          </a>
          .
        </div>
      )}
    </div>
  );
}
