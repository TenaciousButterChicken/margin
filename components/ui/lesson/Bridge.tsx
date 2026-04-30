// End-of-session "bridge" banner - italic, accent-tinted, with a small
// arrow. Visually marks the end of the lesson and gestures toward what
// comes next session.

export function Bridge({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lesson-bridge">
      <div className="lesson-bridge-meta">
        <span className="lesson-bridge-label">Next up</span>
        <span className="lesson-bridge-target">{to}</span>
        <svg className="lesson-bridge-arrow" viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path
            d="M4 12 L20 12 M14 6 L20 12 L14 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="lesson-bridge-body">{children}</div>
    </div>
  );
}
