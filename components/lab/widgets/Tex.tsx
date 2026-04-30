"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

// KaTeX-rendered math, lazy-loaded with the Lab. Two flavors:
//  • <Math tex="..." />        - inline (e.g. for symbol mentions in prose)
//  • <Math tex="..." display />- centered block, larger size

export function Tex({
  tex,
  display = false,
  scale = 1,
}: {
  tex: string;
  display?: boolean;
  /** Multiplier on KaTeX's default size - 1 = default, 1.4 = 40% larger */
  scale?: number;
}) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    output: "html",
    strict: "ignore",
  });
  return (
    <span
      style={{ fontSize: `${scale}em`, color: "var(--neutral-900)" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
