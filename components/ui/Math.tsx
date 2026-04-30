import katex from "katex";

// Server-rendered KaTeX. Two flavors:
//  • <Math tex="..." />          - inline, used inside prose
//  • <Math tex="..." display />  - centered block, larger, breathing room

export function Math({
  tex,
  display = false,
}: {
  tex: string;
  display?: boolean;
}) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
    strict: "ignore",
  });

  if (display) {
    return (
      <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }
  return (
    <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
