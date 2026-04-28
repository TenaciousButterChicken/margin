// Activity motifs — small inline marks (64 × 64 nominal) per master plan §7.1.
// Names match the LabConfig motif enum: hiker, neuron, data_point,
// decision_boundary, cost_surface, attention, embedding, training.

type MotifProps = { size?: number };

export function MotifNeuron({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {[14, 22, 30, 38, 46].map((y, i) => (
        <line
          key={i}
          x1="6"
          y1={y}
          x2="22"
          y2="32"
          stroke="var(--neutral-700)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity={0.35 + i * 0.12}
        />
      ))}
      <circle cx="28" cy="32" r="8" fill="var(--neutral-0)" stroke="var(--neutral-900)" strokeWidth="1.75" />
      <path d="M36 32 L52 32" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="32" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export function MotifDataPoint({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="22" stroke="var(--neutral-300)" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="32" cy="32" r="6" fill="var(--accent)" />
      <line x1="32" y1="6" x2="32" y2="14" stroke="var(--neutral-400)" strokeWidth="1" />
      <line x1="32" y1="50" x2="32" y2="58" stroke="var(--neutral-400)" strokeWidth="1" />
      <line x1="6" y1="32" x2="14" y2="32" stroke="var(--neutral-400)" strokeWidth="1" />
      <line x1="50" y1="32" x2="58" y2="32" stroke="var(--neutral-400)" strokeWidth="1" />
    </svg>
  );
}

export function MotifDecisionBoundary({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M8 52 L56 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      {[[18, 46], [28, 50], [22, 38]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="var(--neutral-700)" />
      ))}
      {[[40, 22], [48, 26], [50, 16]].map(([x, y], i) => (
        <path
          key={"c" + i}
          d={`M${x - 2} ${y - 2} L${x + 2} ${y + 2} M${x - 2} ${y + 2} L${x + 2} ${y - 2}`}
          stroke="var(--neutral-700)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function MotifCostSurface({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <ellipse cx="32" cy="36" rx="22" ry="10" stroke="var(--neutral-300)" strokeWidth="1" />
      <ellipse cx="32" cy="34" rx="14" ry="6" stroke="var(--neutral-400)" strokeWidth="1.25" />
      <ellipse cx="32" cy="32" rx="6" ry="3" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="2" fill="var(--accent)" />
      <path d="M48 16 L40 24 L36 28" stroke="var(--neutral-700)" strokeWidth="1.25" strokeLinecap="round" fill="none" />
      <circle cx="36" cy="28" r="1.5" fill="var(--neutral-700)" />
    </svg>
  );
}

export function MotifAttention({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {[10, 22, 34, 46].map((y, i) => (
        <rect
          key={"q" + i}
          x="6"
          y={y}
          width="10"
          height="6"
          rx="1.5"
          fill={i === 1 ? "var(--accent-subtle)" : "var(--neutral-100)"}
          stroke={i === 1 ? "var(--accent)" : "var(--neutral-400)"}
          strokeWidth="1"
        />
      ))}
      {[10, 22, 34, 46].map((y, i) => (
        <rect
          key={"k" + i}
          x="48"
          y={y}
          width="10"
          height="6"
          rx="1.5"
          fill="var(--neutral-100)"
          stroke="var(--neutral-400)"
          strokeWidth="1"
        />
      ))}
      {[10, 22, 34, 46].map((ky, i) => (
        <line
          key={"e" + i}
          x1="16"
          y1="25"
          x2="48"
          y2={ky + 3}
          stroke="var(--accent)"
          strokeWidth={i === 0 ? 1.75 : 0.6}
          opacity={i === 0 ? 0.9 : 0.3}
        />
      ))}
    </svg>
  );
}

export function MotifEmbedding({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M8 56 L56 56" stroke="var(--neutral-300)" strokeWidth="1" />
      <path d="M8 8 L8 56" stroke="var(--neutral-300)" strokeWidth="1" />
      {[[20, 44], [30, 38], [42, 28], [50, 18]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="var(--neutral-700)" />
      ))}
      <path d="M8 56 L36 30" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M36 30 L33 31 M36 30 L34 33" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function MotifTraining({ size = 64 }: MotifProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M8 56 L56 56" stroke="var(--neutral-300)" strokeWidth="1" />
      <path d="M8 8 L8 56" stroke="var(--neutral-300)" strokeWidth="1" />
      <path
        d="M10 14 C 18 18, 22 28, 26 30 S 36 38, 40 44 S 50 50, 56 50"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="56" cy="50" r="3" fill="var(--accent)" />
      <circle cx="56" cy="50" r="6" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

import { HikerMark } from "./HikerMark";

export type MotifKind =
  | "hiker"
  | "neuron"
  | "data_point"
  | "decision_boundary"
  | "cost_surface"
  | "attention"
  | "embedding"
  | "training";

export function Motif({ kind, size = 32 }: { kind: MotifKind; size?: number }) {
  switch (kind) {
    case "hiker":             return <HikerMark size={size} color="var(--accent)" />;
    case "neuron":            return <MotifNeuron size={size} />;
    case "data_point":        return <MotifDataPoint size={size} />;
    case "decision_boundary": return <MotifDecisionBoundary size={size} />;
    case "cost_surface":      return <MotifCostSurface size={size} />;
    case "attention":         return <MotifAttention size={size} />;
    case "embedding":         return <MotifEmbedding size={size} />;
    case "training":          return <MotifTraining size={size} />;
  }
}
