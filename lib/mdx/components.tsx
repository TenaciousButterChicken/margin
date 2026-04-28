// MDX → React component map for lesson notes. Public register only.
// The Lab register's MarkdownPanel widget will get its own map later.

import type {
  HTMLAttributes,
  OlHTMLAttributes,
} from "react";
import { Callout } from "@/components/ui/Callout";
import { CodeBlock, InlineCode } from "@/components/ui/CodeBlock";

type H = HTMLAttributes<HTMLHeadingElement>;
type P = HTMLAttributes<HTMLParagraphElement>;
type LIST = OlHTMLAttributes<HTMLOListElement | HTMLUListElement>;
type LI = HTMLAttributes<HTMLLIElement>;
type PRE = HTMLAttributes<HTMLPreElement>;
type CODE = HTMLAttributes<HTMLElement> & { className?: string };
type SPAN = HTMLAttributes<HTMLElement>;

export const lessonMdxComponents = {
  h1: (p: H) => (
    <h1
      style={{
        fontSize: 36,
        fontWeight: 600,
        lineHeight: 1.15,
        letterSpacing: "-0.015em",
        margin: "0 0 16px",
      }}
      {...p}
    />
  ),
  h2: (p: H) => (
    <h2
      style={{
        fontSize: 24,
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
        margin: "40px 0 12px",
      }}
      {...p}
    />
  ),
  h3: (p: H) => (
    <h3
      style={{
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.35,
        margin: "32px 0 8px",
      }}
      {...p}
    />
  ),
  p: (p: P) => (
    <p
      style={{
        fontSize: 17,
        lineHeight: 1.65,
        color: "var(--neutral-700)",
        margin: "0 0 16px",
      }}
      {...p}
    />
  ),
  ul: (p: LIST) => (
    <ul style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)", margin: "0 0 16px 24px" }} {...p} />
  ),
  ol: (p: LIST) => (
    <ol style={{ fontSize: 17, lineHeight: 1.65, color: "var(--neutral-700)", margin: "0 0 16px 24px" }} {...p} />
  ),
  li: (p: LI) => <li style={{ marginBottom: 4 }} {...p} />,
  pre: (p: PRE) => <CodeBlock {...p} />,
  code: ({ children, className }: CODE) => {
    if (className) return <code className={className}>{children}</code>;
    return <InlineCode>{children}</InlineCode>;
  },
  strong: (p: SPAN) => <strong style={{ color: "var(--neutral-900)", fontWeight: 600 }} {...p} />,
  em: (p: SPAN) => <em {...p} />,
  Callout,
};
