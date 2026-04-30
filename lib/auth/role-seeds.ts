import type { RoleSlug } from "@/lib/auth/profile";

// Anti-lockout safety net. The two seats here are re-asserted on every
// sign-in by syncProfileForAuthUser - if someone fat-fingers a role
// change in the roster UI for these emails, the next sign-in fixes it.
// All other roles (president, VP, secretary, treasurer, teacher-sponsor)
// are managed via the roster UI only.
export const EMAIL_TO_ROLE: Readonly<Record<string, RoleSlug>> = {
  "neil.moudgil27@ycdsbk12.ca": "founder",
  "ryan.lai27@ycdsbk12.ca": "co-founder",
};

export function seedRoleForEmail(email: string | null | undefined): RoleSlug | null {
  if (!email) return null;
  return EMAIL_TO_ROLE[email.toLowerCase()] ?? null;
}
