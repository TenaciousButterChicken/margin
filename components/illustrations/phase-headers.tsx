// Phase headers - wide horizontal motifs at the top of phase-opener lessons.
// 280 × 140 nominal. Two colors max: --accent + --neutral-700.

type PhaseHeaderProps = { width?: number; style?: React.CSSProperties };

export function PhaseHeaderFoundations({ width = 280, style }: PhaseHeaderProps) {
  const h = Math.round(width * 0.5);
  return (
    <svg width={width} height={h} viewBox="0 0 280 140" fill="none" style={style} aria-label="Phase 1 - Foundations">
      <circle cx="140" cy="70" r="56" stroke="var(--neutral-300)" strokeWidth="1" />
      <circle cx="140" cy="70" r="34" stroke="var(--neutral-400)" strokeWidth="1.25" />
      <circle cx="140" cy="70" r="14" stroke="var(--accent)" strokeWidth="1.75" />
      <circle cx="140" cy="70" r="3.5" fill="var(--accent)" />
      <circle cx="86" cy="58" r="2.5" fill="var(--neutral-700)" />
      <circle cx="200" cy="84" r="2.5" fill="var(--neutral-700)" />
      <circle cx="160" cy="120" r="2.5" fill="var(--neutral-700)" />
    </svg>
  );
}

export function PhaseHeaderLinearRegression({ width = 280, style }: PhaseHeaderProps) {
  const h = Math.round(width * 0.5);
  return (
    <svg width={width} height={h} viewBox="0 0 280 140" fill="none" style={style} aria-label="Phase 2 - Linear Regression">
      <path d="M24 116 L256 116" stroke="var(--neutral-300)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 24 L24 116" stroke="var(--neutral-300)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 104 L252 32" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="round" />
      {[
        [42, 96], [62, 102], [78, 88], [96, 92],
        [120, 78], [138, 70], [156, 64], [178, 58],
        [198, 52], [222, 44], [240, 36],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="3.5"
          fill={i === 4 || i === 9 ? "var(--accent)" : "var(--neutral-700)"}
        />
      ))}
      <path d="M120 78 L120 72" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function PhaseHeaderClassification({ width = 280, style }: PhaseHeaderProps) {
  const h = Math.round(width * 0.5);
  return (
    <svg width={width} height={h} viewBox="0 0 280 140" fill="none" style={style} aria-label="Phase 3 - Classification">
      <path d="M40 116 L240 24" stroke="var(--accent)" strokeWidth="2.25" strokeLinecap="round" />
      {[[60, 96], [82, 108], [78, 80], [102, 102], [120, 110], [98, 88], [134, 116]].map(([x, y], i) => (
        <circle key={"a" + i} cx={x} cy={y} r="3.5" fill="var(--neutral-700)" />
      ))}
      {[[156, 38], [180, 50], [202, 38], [220, 56], [196, 68], [176, 72], [232, 70]].map(([x, y], i) => (
        <path
          key={"b" + i}
          d={`M${x - 3} ${y} L${x + 3} ${y} M${x} ${y - 3} L${x} ${y + 3}`}
          stroke="var(--neutral-700)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function PhaseHeaderNetworks({ width = 280, style }: PhaseHeaderProps) {
  const h = Math.round(width * 0.5);
  const L: [number, number][][] = [
    [[64, 50], [64, 100]],
    [[140, 30], [140, 70], [140, 110]],
    [[216, 70]],
  ];
  const edges: Array<[[number, number], [number, number], number]> = [];
  L[0].forEach((a, i) =>
    L[1].forEach((b, j) => edges.push([a, b, (i + j) % 2 === 0 ? 0.85 : 0.4]))
  );
  L[1].forEach((a) => L[2].forEach((b) => edges.push([a, b, 0.7])));
  return (
    <svg width={width} height={h} viewBox="0 0 280 140" fill="none" style={style} aria-label="Phase 4 - Networks">
      {edges.map(([[x1, y1], [x2, y2], w], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={w > 0.6 ? "var(--accent)" : "var(--neutral-300)"}
          strokeWidth={w * 1.6 + 0.4}
          opacity={w}
        />
      ))}
      {L.flat().map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="var(--neutral-0)" stroke="var(--neutral-700)" strokeWidth="1.75" />
      ))}
    </svg>
  );
}

export function PhaseHeaderSequence({ width = 280, style }: PhaseHeaderProps) {
  const h = Math.round(width * 0.5);
  return (
    <svg width={width} height={h} viewBox="0 0 280 140" fill="none" style={style} aria-label="Phase 5 - Modern Era">
      <path d="M28 70 L252 70" stroke="var(--neutral-200)" strokeWidth="1" strokeDasharray="2 4" />
      {[60, 140, 220].map((x, i) => (
        <g key={i}>
          <rect
            x={x - 14}
            y={56}
            width="28"
            height="28"
            rx="4"
            fill={i === 1 ? "var(--accent-subtle)" : "var(--neutral-0)"}
            stroke={i === 1 ? "var(--accent)" : "var(--neutral-700)"}
            strokeWidth="1.75"
          />
          <circle cx={x} cy={70} r="2.5" fill={i === 1 ? "var(--accent)" : "var(--neutral-700)"} />
        </g>
      ))}
      <path d="M126 60 Q100 28, 74 60" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M74 60 L77 56 M74 60 L78 63" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export const PHASE_HEADERS: Record<number, React.ComponentType<PhaseHeaderProps>> = {
  1: PhaseHeaderFoundations,
  2: PhaseHeaderLinearRegression,
  3: PhaseHeaderClassification,
  4: PhaseHeaderNetworks,
  5: PhaseHeaderSequence,
};
