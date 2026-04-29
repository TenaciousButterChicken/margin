// MDX → React component map for lesson notes. Public register only.
// The Lab register's MarkdownPanel widget will get its own map later.

import type {
  HTMLAttributes,
  OlHTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";
import { Callout } from "@/components/ui/Callout";
import { CodeBlock, InlineCode } from "@/components/ui/CodeBlock";
import { Math } from "@/components/ui/Math";
import { BigIdea } from "@/components/ui/lesson/BigIdea";
import { Objectives, Objective } from "@/components/ui/lesson/Objectives";
import { Vocab, Term } from "@/components/ui/lesson/Vocab";
import { Activity } from "@/components/ui/lesson/Activity";
import { FAQ, Q } from "@/components/ui/lesson/FAQ";
import { Bridge } from "@/components/ui/lesson/Bridge";
import { Output } from "@/components/ui/lesson/Output";

type H = HTMLAttributes<HTMLHeadingElement>;
type P = HTMLAttributes<HTMLParagraphElement>;
type LIST = OlHTMLAttributes<HTMLOListElement | HTMLUListElement>;
type LI = HTMLAttributes<HTMLLIElement>;
type PRE = HTMLAttributes<HTMLPreElement>;
type CODE = HTMLAttributes<HTMLElement> & { className?: string };
type SPAN = HTMLAttributes<HTMLElement>;
type TABLE = TableHTMLAttributes<HTMLTableElement>;
type SECT = HTMLAttributes<HTMLTableSectionElement>;
type TR = HTMLAttributes<HTMLTableRowElement>;
type TH = ThHTMLAttributes<HTMLTableCellElement>;
type TD = TdHTMLAttributes<HTMLTableCellElement>;

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
  // Tables for worked examples (xᵢ, yᵢ, ŷᵢ, error²). The wrapper div
  // gives us horizontal scroll on narrow viewports.
  table: (p: TABLE) => (
    <div className="lesson-table-wrap">
      <table className="lesson-table" {...p} />
    </div>
  ),
  thead: (p: SECT) => <thead {...p} />,
  tbody: (p: SECT) => <tbody {...p} />,
  tr: (p: TR) => <tr {...p} />,
  th: (p: TH) => <th {...p} />,
  td: (p: TD) => <td {...p} />,
  // Custom lesson primitives
  Callout,
  Math,
  BigIdea,
  Objectives,
  Objective,
  Vocab,
  Term,
  Activity,
  FAQ,
  Q,
  Bridge,
  Output,
};
