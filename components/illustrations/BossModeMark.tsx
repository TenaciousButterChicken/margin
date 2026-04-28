// Boss Mode marker — distinctive callout marker, NOT an emoji.
// Diamond with inscribed dot suggesting "deeper inside".

export function BossModeMark({
  size = 20,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style} aria-label="Boss Mode">
      <path d="M10 2 L18 10 L10 18 L2 10 Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <path d="M10 6 L14 10 L10 14 L6 10 Z" fill={color} />
    </svg>
  );
}
