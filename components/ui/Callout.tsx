import { BossModeMark } from "@/components/illustrations/BossModeMark";

type Variant = "note" | "warning" | "boss";

// Per design brief §5.5 + tokens.css .callout-* classes. Matches the
// design package's lesson-page.jsx callouts exactly.

export function Callout({
  variant = "note",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) {
  const cls =
    variant === "note"
      ? "callout callout-note"
      : variant === "warning"
      ? "callout callout-warning"
      : "callout callout-boss";

  return (
    <div className={cls}>
      {variant === "note" && (
        <svg className="callout-marker" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="#1E40AF" strokeWidth="1.5" />
          <path d="M10 6 L10 11 M10 13.5 L10 14" stroke="#1E40AF" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )}
      {variant === "warning" && (
        <svg className="callout-marker" viewBox="0 0 20 20">
          <path d="M10 2 L18 17 L2 17 Z" fill="none" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M10 8 L10 12 M10 14 L10 14.5" stroke="#B45309" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )}
      {variant === "boss" && (
        <BossModeMark style={{ color: "var(--accent)" }} />
      )}
      <div className="callout-body">{children}</div>
    </div>
  );
}
