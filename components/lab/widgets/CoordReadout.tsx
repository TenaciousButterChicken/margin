"use client";

import { useChannel } from "@/lib/lab/LabContext";
import { X_MEAN, X_STD, Y_MEAN, Y_STD } from "@/lib/lab/sim/gradient-descent";

// Live "w = 0.72, b = 1.43" readout. Shows the current bowl marker
// position translated into ML naming (w = slope = w1, b = intercept = w0)
// in the original (un-standardized) coordinate space, so the numbers
// match the line that's drawn through the data.
//
// Beat 2 introduced the bowl as "every possible line"; Beat 7 named the
// numbers w and b. This component makes the link numerical: when the
// hiker moves on the bowl, you see exactly which line you're on.

type Pos = { w0: number; w1: number };

export function CoordReadout() {
  const pos = useChannel<Pos>("w_position") ?? { w0: 0, w1: 0 };

  // Map standardized (w0, w1) back to original (b, w) for the line
  // y = w * x + b drawn on the data scatter.
  //   slope (orig) = w1 * Y_STD / X_STD
  //   intercept (orig) = Y_MEAN + Y_STD * w0 - slopeOrig * X_MEAN
  const slopeOrig = (pos.w1 * Y_STD) / X_STD;
  const interceptOrig = Y_MEAN + Y_STD * pos.w0 - slopeOrig * X_MEAN;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        padding: "8px 14px",
        background: "var(--neutral-50)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--neutral-700)",
      }}
    >
      <span>
        <span style={{ color: "var(--lab-cyan)", fontWeight: 600 }}>w</span>
        {" = "}
        <span style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
          {slopeOrig.toFixed(2)}
        </span>
      </span>
      <span style={{ color: "var(--neutral-300)" }}>|</span>
      <span>
        <span style={{ color: "var(--lab-warm)", fontWeight: 600 }}>b</span>
        {" = "}
        <span style={{ color: "var(--neutral-900)", fontWeight: 600 }}>
          {interceptOrig.toFixed(2)}
        </span>
      </span>
      <span style={{ color: "var(--neutral-300)" }}>|</span>
      <span style={{ fontSize: 11, color: "var(--neutral-500)" }}>
        line: y = {slopeOrig.toFixed(2)}x {interceptOrig >= 0 ? "+" : "-"}{" "}
        {Math.abs(interceptOrig).toFixed(2)}
      </span>
    </div>
  );
}
