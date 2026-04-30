// Static code block for lesson notes. Per design brief §8 the syntax
// palette is defined in tokens.css (.tok-*). Pre-highlighting belongs
// to a later phase - for v0 the body renders monochrome via .code-block,
// and MDX authors can wrap tokens in <span className="tok-kw"> manually
// when they want emphasis (the design package does this).

export function CodeBlock({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <pre className={`code-block ${className}`.trim()}>{children}</pre>;
}

export function InlineCode({ children }: { children?: React.ReactNode }) {
  return <code className="code-inline">{children}</code>;
}
