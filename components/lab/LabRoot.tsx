"use client";

import dynamic from "next/dynamic";
import { LabProvider } from "@/lib/lab/LabContext";
import { LabHeader } from "./LabHeader";
import { Widget } from "./Widget";
import { SlidersWidget } from "./widgets/Sliders";
import { LossCurve } from "./widgets/LossCurve";
import { ChallengePanel } from "./ChallengePanel";
import { SimRunner } from "./SimRunner";

// Three.js can't render in SSR. Dynamic-import with ssr:false.
const Surface3D = dynamic(
  () => import("./widgets/Surface3D").then((m) => m.Surface3D),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "var(--neutral-500)",
          fontFamily: "var(--font-mono)",
          background: "var(--neutral-50)",
        }}
      >
        Loading 3D surface…
      </div>
    ),
  }
);

// Sprint 1 hardcodes Session 6's layout. Sprint 3 reads it from
// lab.config.json and mounts widgets via the registry.

export function LabRoot({
  sessionN = 6,
  title = "The hiker's descent",
  onClose,
}: {
  sessionN?: number;
  title?: string;
  onClose?: () => void;
}) {
  return (
    <LabProvider>
      <div
        data-register="lab"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "var(--neutral-50)",
          overflow: "hidden",
        }}
      >
        <SimRunner stepBatch={4} />
        <LabHeader title={title} sessionN={sessionN} onClose={onClose} />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div style={{ flex: 1, padding: 16, overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Widget title="Cost surface" kicker="3D · w₀ × w₁" span={2}>
                <Surface3D />
              </Widget>

              <Widget title="Loss" kicker="MSE">
                <LossCurve />
              </Widget>

              <Widget title="Controls">
                <SlidersWidget
                  controls={[
                    {
                      key: "lr",
                      label: "Learning rate",
                      min: 0.001,
                      max: 0.5,
                      step: 0.001,
                      initial: 0.08,
                      color: "lab-cyan",
                      formatter: "fixed3",
                      publishesAs: "lr",
                    },
                  ]}
                  actions={[
                    { key: "step", label: "Step ×4", style: "primary", publishesAs: "do_step" },
                    { key: "reset", label: "Reset", style: "secondary", publishesAs: "do_reset" },
                  ]}
                />
              </Widget>

              <Widget title="step.py" kicker="reference · run via slider for now" span={2}>
                <CodeReference />
              </Widget>
            </div>
          </div>
          <ChallengePanel />
        </div>
      </div>
    </LabProvider>
  );
}

function CodeReference() {
  return (
    <>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.6, color: "var(--neutral-900)" }}>
        <div>
          <span className="tok-kw">def</span> <span className="tok-fn">step</span>(w, X, y, lr):
        </div>
        <div>{"    "}preds = w[0] + w[1] * X</div>
        <div>
          {"    "}grad = <span className="tok-num">2</span> * <span className="tok-bi">np</span>.mean((preds - y))
        </div>
        <div>
          {"    "}<span className="tok-kw">return</span> w - lr * grad
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px dashed var(--neutral-200)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--neutral-500)",
        }}
      >
        Sprint 2: this becomes a real Python cell you can edit. For now the simulation runs in JS and the slider drives it.
      </div>
    </>
  );
}
