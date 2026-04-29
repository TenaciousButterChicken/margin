// The lead card under the session title. One-to-two sentence framing
// of "what this whole session is about." Visually distinct from prose
// so it sets the tone without feeling like just another paragraph.

export function BigIdea({ children }: { children: React.ReactNode }) {
  return (
    <div className="lesson-big-idea">
      <span className="lesson-big-idea-label">Big idea</span>
      <div className="lesson-big-idea-body">{children}</div>
    </div>
  );
}
