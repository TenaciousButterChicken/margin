// Generic widget frame — title bar with kicker on the right, body below.
// Same visual the design package's Widget had in lab-session6.jsx.

export function Widget({
  title,
  kicker,
  children,
  span,
  dense,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  span?: number;
  dense?: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: span ? `span ${span}` : "auto",
        background: "var(--neutral-0)",
        border: "1px solid var(--neutral-200)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--neutral-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--neutral-50)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neutral-900)" }}>{title}</span>
        {kicker && (
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--neutral-500)" }}>
            {kicker}
          </span>
        )}
      </div>
      <div style={{ padding: dense ? 12 : 20, flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
