"use client";

import { LabProvider } from "@/lib/lab/LabContext";
import { LabHeader } from "./LabHeader";
import { BeatJourney } from "./BeatJourney";

// Sprint 1.5: Lab is a beat-driven journey, not a static grid of widgets.
// Sprint 3 will read the beat sequence from lab.config.json. For now
// Session 6 hardcodes its 9 beats in lib/lab/beats.ts.

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
        <LabHeader title={title} sessionN={sessionN} onClose={onClose} />
        <BeatJourney />
      </div>
    </LabProvider>
  );
}
