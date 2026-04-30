// Vocabulary list at the end of a session. Each <Term> renders one
// "term - definition" line. A scannable glossary so students can review
// without re-reading the prose.

export function Vocab({ children }: { children: React.ReactNode }) {
  return (
    <div className="lesson-vocab">
      <div className="lesson-vocab-list">{children}</div>
    </div>
  );
}

export function Term({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lesson-vocab-item">
      <span className="lesson-vocab-term">{name}</span>
      <span className="lesson-vocab-sep">-</span>
      <span className="lesson-vocab-def">{children}</span>
    </div>
  );
}
