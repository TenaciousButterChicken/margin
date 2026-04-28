// The blindfolded hiker — gradient-descent motif (Session 6).
// Geometric figure with personality, used sparingly. Single line weight.

const ILLO_INK = "#1A1A18";
const ILLO_PAPER = "#FAFAF9";

export function HikerMark({
  size = 64,
  color = "var(--lab-warm)",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={style}
      aria-label="Hiker"
    >
      <path d="M8 56 L56 56" stroke="var(--neutral-300)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M30 48 L30 32 L34 32 L34 48"
        stroke={ILLO_INK}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M30 48 L26 56 M34 48 L38 56" stroke={ILLO_INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="24" r="6" stroke={ILLO_INK} strokeWidth="2" fill={ILLO_PAPER} />
      <path d="M25 24 L39 24" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M36 36 L46 52" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="52" r="2" fill={color} />
    </svg>
  );
}
