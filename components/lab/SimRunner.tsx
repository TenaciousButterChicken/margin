"use client";

import { useEffect, useRef } from "react";
import { useChannel, usePublish, usePulseToken } from "@/lib/lab/LabContext";
import { initialState, stepN, type SimState } from "@/lib/lab/sim/gradient-descent";

// Headless component: owns the gradient-descent SimState. Listens for
// channel events:
//   • lr (number)        → update learning rate, no step
//   • do_step (pulse)    → step the simulator forward by `iters` (default 4)
//   • do_step1 (pulse)   → step exactly once
//   • do_reset (pulse)   → reset to initial state
// Publishes:
//   • w_history          → array of {w0,w1,loss} for Surface3D + LossCurve
//   • loss_history       → array of {step,loss}
//   • sim_snapshot       → small object for header status + checker

export function SimRunner({ stepBatch = 4 }: { stepBatch?: number }) {
  const lr = useChannel<number>("lr") ?? 0.08;
  const stepToken = usePulseToken("do_step");
  const stepOnceToken = usePulseToken("do_step1");
  const resetToken = usePulseToken("do_reset");
  const pub = usePublish();
  const stateRef = useRef<SimState>(initialState(lr));

  // Push the initial state once on mount so widgets render the start point.
  useEffect(() => {
    const s = initialState(lr);
    stateRef.current = s;
    pub.set("w_history", s.history);
    pub.set("sim_snapshot", { step: s.step, status: s.status, history: s.history });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep lr live in the state without re-stepping.
  useEffect(() => {
    stateRef.current = { ...stateRef.current, lr };
  }, [lr]);

  // Step batch on `do_step`
  useEffect(() => {
    if (stepToken === 0) return;
    stateRef.current = stepN(stateRef.current, stepBatch);
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepToken]);

  // Single step on `do_step1`
  useEffect(() => {
    if (stepOnceToken === 0) return;
    stateRef.current = stepN(stateRef.current, 1);
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepOnceToken]);

  // Reset
  useEffect(() => {
    if (resetToken === 0) return;
    const s = initialState(stateRef.current.lr);
    stateRef.current = s;
    publish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  function publish() {
    const s = stateRef.current;
    pub.set("w_history", s.history);
    pub.set("sim_snapshot", { step: s.step, status: s.status, history: s.history });
  }

  return null;
}
