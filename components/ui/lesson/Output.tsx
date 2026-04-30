// Sample console output - a muted-gray "what you'd see in the
// terminal" pre block, distinguishable from input code blocks.
// Used right after a runnable code block so students can see the
// expected result without copy-pasting.

export function Output({ children }: { children: React.ReactNode }) {
  return (
    <div className="lesson-output">
      <span className="lesson-output-label">Output</span>
      <pre className="lesson-output-body">{children}</pre>
    </div>
  );
}
