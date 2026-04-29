// Learning objectives checklist. Renders a header + a checked list.
// Use either <Objective> children or pass an `items` string array.

export function Objectives({
  children,
  items,
}: {
  children?: React.ReactNode;
  items?: string[];
}) {
  return (
    <div className="lesson-objectives">
      <span className="lesson-objectives-label">By the end, you&apos;ll be able to</span>
      <ul className="lesson-objectives-list">
        {items
          ? items.map((item, i) => <Objective key={i}>{item}</Objective>)
          : children}
      </ul>
    </div>
  );
}

export function Objective({ children }: { children: React.ReactNode }) {
  return (
    <li className="lesson-objectives-item">
      <span className="lesson-objectives-check" aria-hidden>
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            d="M3 8.5 L6.5 12 L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
