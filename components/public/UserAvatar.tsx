"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { initialsFromEmail, nameFromEmail } from "@/lib/auth/initials";
import { ROLE_LABEL, isAdmin, type RoleSlug } from "@/lib/auth/role";
import { VERSION, COMMIT_SHA, BUILD_DATE } from "@/lib/version";

type UserAvatarProps = {
  email: string;
  role: RoleSlug;
};

export default function UserAvatar({ email, role }: UserAvatarProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dashHover, setDashHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const initials = initialsFromEmail(email);
  const parsedName = nameFromEmail(email);
  const fullName = parsedName && parsedName.length > 0 ? parsedName : email;
  const showDashboard = isAdmin(role);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          background: "var(--neutral-0)",
          border: `1px solid ${hovered ? "var(--neutral-300)" : "var(--neutral-200)"}`,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--accent)",
          fontFamily: "var(--font-sans)",
          transition: "border-color 120ms",
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            minWidth: 240,
            padding: "12px 14px",
            background: "var(--neutral-0)",
            border: "1px solid var(--neutral-200)",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            zIndex: 50,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--neutral-900)",
              }}
            >
              {fullName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--neutral-500)",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
              }}
            >
              {ROLE_LABEL[role]}
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "var(--neutral-200)",
              margin: "12px 0 10px",
            }}
          />

          {showDashboard && (
            <>
              <Link
                href="/teacher"
                onClick={() => setOpen(false)}
                onMouseEnter={() => setDashHover(true)}
                onMouseLeave={() => setDashHover(false)}
                style={{
                  display: "block",
                  padding: "6px 4px",
                  fontSize: 13,
                  color: "var(--neutral-900)",
                  textDecoration: "none",
                  borderRadius: 4,
                  background: dashHover ? "var(--neutral-50)" : "transparent",
                }}
              >
                {"→ Dashboard"}
              </Link>

              <div
                style={{
                  height: 1,
                  background: "var(--neutral-200)",
                  margin: "12px 0 10px",
                }}
              />
            </>
          )}

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--neutral-500)",
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--neutral-700)" }}>
              margin v{VERSION}
            </div>
            <div>commit {"·"} {COMMIT_SHA}</div>
            <div>built {"·"} {BUILD_DATE}</div>
          </div>
        </div>
      )}
    </div>
  );
}
