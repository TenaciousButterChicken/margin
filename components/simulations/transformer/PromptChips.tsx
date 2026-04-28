"use client";

// Prompt template chips. Click fills the textarea; user can edit before
// hitting Run. Styled to match Filter Lab's kernel preset buttons.

const TEMPLATES: { name: string; text: string }[] = [
  { name: "Story",      text: "Once upon a time, there was a" },
  { name: "Geography",  text: "The capital of France is" },
  { name: "Code",       text: "def fibonacci(n):\n    " },
  { name: "Poem",       text: "Roses are red, violets are" },
  { name: "Philosophy", text: "I think therefore I" },
  { name: "Science",    text: "The theory of relativity states that" },
];

export function PromptChips({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--neutral-500)",
          letterSpacing: 0.6,
        }}
      >
        TEMPLATES
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => onPick(t.text)}
            className="btn btn-secondary btn-sm"
            style={{ minWidth: 90 }}
            title={t.text}
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
