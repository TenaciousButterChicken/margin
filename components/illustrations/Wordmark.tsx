// Direction A — pure typographic wordmark, Inter, tight tracking.
// Per design brief §13: confirmed wordmark-only, no separate logomark.

export function Wordmark({
  name = "Margin",
  size = 18,
  color = "var(--neutral-900)",
}: {
  name?: string;
  size?: number;
  color?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        fontSize: size,
        color,
        lineHeight: 1,
      }}
    >
      {name}
    </span>
  );
}
