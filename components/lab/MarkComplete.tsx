"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = { sessionId: string; alreadyCompleted: boolean };

export function MarkComplete({ sessionId, alreadyCompleted }: Props) {
  const [done, setDone] = useState(alreadyCompleted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/session-progress/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    if (res.ok) setDone(true);
    else setError("Could not save. Try again.");
    setPending(false);
  }

  if (done) {
    return (
      <p style={{ fontSize: 14, color: "var(--success, #2a7a3f)", fontWeight: 600, margin: 0 }}>
        ✓ Session marked complete
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Button type="button" variant="primary" disabled={pending} onClick={complete}>
        {pending ? "Saving…" : "Mark session complete"}
      </Button>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
    </div>
  );
}
