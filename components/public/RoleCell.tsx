"use client";

import { useState, useTransition } from "react";
import { ROLE_LABEL, type RoleSlug } from "@/lib/auth/role";
import { updateUserRole } from "@/app/teacher/roster/actions";

const ROLE_OPTIONS: ReadonlyArray<RoleSlug> = [
  "student",
  "founder",
  "co-founder",
  "president",
  "vice-president",
  "secretary",
  "treasurer",
  "teacher-sponsor",
];

// Inline role dropdown for the roster table. Optimistically updates the
// displayed value; reverts on server error. Uses a native <select> styled
// to be unobtrusive in the table cell.
export function RoleCell({
  userId,
  initialRole,
}: {
  userId: string;
  initialRole: RoleSlug;
}) {
  const [role, setRole] = useState<RoleSlug>(initialRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as RoleSlug;
    const prev = role;
    setRole(next);
    setError(null);
    startTransition(async () => {
      const res = await updateUserRole(userId, next);
      if (!res.ok) {
        setRole(prev);
        setError(res.error);
        // eslint-disable-next-line no-console
        console.error("updateUserRole failed:", res.error);
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <select
        value={role}
        onChange={onChange}
        disabled={isPending}
        style={{
          fontSize: 13,
          fontFamily: "inherit",
          color: role === "student" ? "var(--neutral-700)" : "var(--accent)",
          fontWeight: role === "student" ? 400 : 600,
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: 4,
          padding: "2px 6px",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.6 : 1,
          transition: "border-color 120ms, background 120ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLSelectElement).style.borderColor =
            "var(--neutral-300)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLSelectElement).style.borderColor =
            "transparent";
        }}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {error && (
        <span
          style={{
            fontSize: 11,
            color: "var(--lab-warm)",
            fontFamily: "var(--font-mono)",
          }}
          title={error}
        >
          (failed)
        </span>
      )}
    </span>
  );
}
