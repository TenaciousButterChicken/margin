"use client";

import { useEffect } from "react";

// Mounts on session/lab pages. While the tab is visible, POSTs a heartbeat
// every 15s. On tab close / hidden, fires a final sendBeacon so the trailing
// 15s window isn't lost.
//
// Server enforces:
//   - 15s bucket dedup via PK on (user_id, session_id, bucket_ts)
//   - approved-status RLS check
// So we don't gate on the client; if the user isn't approved, the API
// quietly 403s and time isn't recorded. That's the desired behavior.

type Props = { sessionId: string; labId?: string };

export function TimeOnPage({ sessionId, labId }: Props) {
  useEffect(() => {
    const HEARTBEAT_MS = 15_000;
    const url = "/api/heartbeat";
    const payload = JSON.stringify({ session_id: sessionId, lab_id: labId ?? null });

    let interval: number | null = null;

    function sendHeartbeat() {
      if (document.visibilityState !== "visible") return;
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* drop silently */
      });
    }

    function sendFinalBeacon() {
      try {
        navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
      } catch {
        /* drop silently */
      }
    }

    function startInterval() {
      if (interval !== null) return;
      sendHeartbeat();
      interval = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
    }

    function stopInterval() {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        startInterval();
      } else {
        stopInterval();
        sendFinalBeacon();
      }
    }

    if (document.visibilityState === "visible") startInterval();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", sendFinalBeacon);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", sendFinalBeacon);
      sendFinalBeacon();
    };
  }, [sessionId, labId]);

  return null;
}
