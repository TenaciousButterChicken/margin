"use client";

import { LabProvider } from "@/lib/lab/LabContext";
import { LabHeader } from "./LabHeader";
import { BeatJourney } from "./BeatJourney";
import { getPhaseBySlug } from "@/lib/sessions";

// Phase-level lab. Phase metadata (title, summary) is read from
// PHASES in lib/sessions.ts via the phaseSlug prop. The internal
// beat sequence is still hardcoded in lib/lab/beats.ts; sprint 3
// will read it from lab.config.json per phase.

export function LabRoot({
  phaseSlug,
  onClose,
}: {
  phaseSlug: string;
  onClose?: () => void;
}) {
  const phase = getPhaseBySlug(phaseSlug);
  if (!phase || !phase.lab) return null;

  return (
    <LabProvider>
      <div
        data-register="lab"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--neutral-50)",
          overflow: "hidden",
        }}
      >
        <LabHeader
          title={phase.lab.title}
          phaseLabel={`Phase ${phase.n}`}
          onClose={onClose}
        />
        <BeatJourney />
      </div>
    </LabProvider>
  );
}
