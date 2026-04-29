"use client";

import Link from "next/link";
import "./GooeyNav.css";

// Static pill nav inspired by React Bits' GooeyNav. Animations
// (particles + gooey blur filter + spring transition) are stripped per
// request — only the visual pill on the active item remains. Routing
// uses Next.js Link so clicks do client-side nav; the active item is
// determined by the parent's `current` prop, not internal state.

export type GooeyNavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export function GooeyNav({ items }: { items: GooeyNavItem[] }) {
  return (
    <div className="gooey-nav-container">
      <nav>
        <ul>
          {items.map((item, i) => (
            <li key={i} className={item.active ? "active" : ""}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default GooeyNav;
