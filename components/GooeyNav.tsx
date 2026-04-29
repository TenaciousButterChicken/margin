"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./GooeyNav.css";

// Pill nav with a traveling clay pill that smoothly slides to the
// active item. Click an item: the pill animates from the previous
// active item's position to the new one with a slight spring overshoot.
// Routing uses Next.js Link so it does client-side nav.

export type GooeyNavItem = {
  label: string;
  href: string;
  active?: boolean;
};

export function GooeyNav({ items }: { items: GooeyNavItem[] }) {
  const initialActive = Math.max(
    0,
    items.findIndex((it) => it.active)
  );
  const [activeIndex, setActiveIndex] = useState(initialActive);
  const [pillReady, setPillReady] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLUListElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  // Position the pill over the currently-active <li>. Called on mount,
  // on every active-index change, and on container resize.
  function updatePillPosition() {
    if (!containerRef.current || !navRef.current || !pillRef.current) return;
    const li = navRef.current.querySelectorAll("li")[activeIndex];
    if (!li) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const lRect = li.getBoundingClientRect();
    pillRef.current.style.left = `${lRect.left - cRect.left}px`;
    pillRef.current.style.top = `${lRect.top - cRect.top}px`;
    pillRef.current.style.width = `${lRect.width}px`;
    pillRef.current.style.height = `${lRect.height}px`;
  }

  useEffect(() => {
    // First paint: jump to position without animating, then enable the
    // transition. Otherwise the pill flies in from (0,0) on first load.
    updatePillPosition();
    const t = window.setTimeout(() => setPillReady(true), 30);
    const ro = new ResizeObserver(updatePillPosition);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updatePillPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  function handleClick(index: number) {
    setActiveIndex(index);
  }

  return (
    <div ref={containerRef} className="gooey-nav-container">
      <div
        ref={pillRef}
        className={`gooey-nav-pill ${pillReady ? "is-ready" : ""}`}
        aria-hidden
      />
      <nav>
        <ul ref={navRef}>
          {items.map((item, i) => (
            <li key={i} className={activeIndex === i ? "active" : ""}>
              <Link href={item.href} onClick={() => handleClick(i)}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default GooeyNav;
