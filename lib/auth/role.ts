// Pure role types and helpers, safe to import from client components.
// Server-only helpers (getCurrentProfile, landingPathForProfile) live in
// lib/auth/profile.ts to keep this file free of next/headers.

export type RoleSlug =
  | "student"
  | "founder"
  | "co-founder"
  | "president"
  | "vice-president"
  | "secretary"
  | "treasurer"
  | "teacher-sponsor";

export const ADMIN_ROLES: ReadonlyArray<RoleSlug> = [
  "founder",
  "co-founder",
  "president",
  "vice-president",
  "secretary",
  "treasurer",
  "teacher-sponsor",
];

export function isAdmin(role: RoleSlug): boolean {
  return role !== "student";
}

// Human-readable label for a role. Used by the avatar dropdown and the
// roster role dropdown.
export const ROLE_LABEL: Record<RoleSlug, string> = {
  student: "Student",
  founder: "Founder",
  "co-founder": "Co-Founder",
  president: "President",
  "vice-president": "Vice President",
  secretary: "Secretary",
  treasurer: "Treasurer",
  "teacher-sponsor": "Teacher Sponsor",
};
