# Profile Avatar Menu + Role System - Design Spec

**Date:** 2026-04-30
**Status:** Approved by user, pending implementation plan
**Supersedes:** The two-value `role` enum (`student` | `teacher`) and the hardcoded `TEACHER_EMAILS` list in `lib/auth/teachers.ts`.

## Context

Today the `profiles` table has `role: "student" | "teacher"`. A hardcoded list at `lib/auth/teachers.ts` auto-promotes anyone in it to `teacher` on sign-in, and `lib/teacher/guard.ts` lets only `role === "teacher"` access `/teacher/...`. The signed-in TopNav shows just a "Sign out" button - there's no profile UI, no way to navigate to the dashboard from a session page, and no display of who you're signed in as. Version info currently lives in a tiny bottom-right corner pip on every page.

"Teacher" is not a meaningful role for the club. Real positions are founder, co-founder, president, vice-president, secretary, treasurer, and (eventually) a teacher sponsor. Ryan Lai (`ryan.lai27@ycdsbk12.ca`) is currently labeled `teacher` but is actually co-founder.

## Goal

1. Replace the binary `student | teacher` role with a club-position enum.
2. Add a profile avatar with initials in the TopNav, with a dropdown menu that reveals the dashboard link (for exec roles) and the version info.
3. Add an inline role dropdown on the existing roster page so exec users can promote/demote others without SQL.

## Non-goals

- No avatar image upload. Initials only.
- No role hierarchy / permission tiers among exec roles. Any non-student role gets full dashboard access; any non-student role can edit anyone else's role via the roster UI. Self-foot-shooting is acceptable for an 8-row club roster.
- No rename of the `/teacher` URL. It stays.
- No new `/me` settings page. Profile menu is the entire profile UI.
- No retroactive avatars for OAuth `avatar_url`. We don't render OAuth profile pictures.
- No user-facing sign-up flow change.

## Architecture

### Role enum

The Postgres enum on `profiles.role` expands to:

```
'student'
'founder'
'co-founder'
'president'
'vice-president'
'secretary'
'treasurer'
'teacher-sponsor'
```

Migration steps (Supabase SQL):

```sql
ALTER TYPE profile_role ADD VALUE 'founder';
ALTER TYPE profile_role ADD VALUE 'co-founder';
ALTER TYPE profile_role ADD VALUE 'president';
ALTER TYPE profile_role ADD VALUE 'vice-president';
ALTER TYPE profile_role ADD VALUE 'secretary';
ALTER TYPE profile_role ADD VALUE 'treasurer';
ALTER TYPE profile_role ADD VALUE 'teacher-sponsor';

UPDATE profiles SET role = 'co-founder' WHERE email = 'ryan.lai27@ycdsbk12.ca';
UPDATE profiles SET role = 'founder'    WHERE email = 'neil.moudgil27@ycdsbk12.ca';

-- Note: Postgres can't drop enum values cleanly. The 'teacher' value
-- stays in the enum forever; we just stop assigning it. New records
-- never get 'teacher' because EMAIL_TO_ROLE never returns it.
```

### Hardcoded role seeds

`lib/auth/teachers.ts` is renamed to `lib/auth/role-seeds.ts`:

```ts
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
```

The old `isTeacherEmail()` and `TEACHER_EMAILS` are deleted.

### Profile type + sync rewrite

`lib/auth/profile.ts` exports a new type:

```ts
export type RoleSlug =
  | "student"
  | "founder"
  | "co-founder"
  | "president"
  | "vice-president"
  | "secretary"
  | "treasurer"
  | "teacher-sponsor";

export type Profile = {
  // ... existing fields ...
  role: RoleSlug;
};

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

export function landingPathForProfile(p: Profile | null): string {
  if (!p) return "/awaiting-approval";
  if (p.status === "rejected") return "/access-denied";
  if (p.status === "pending") return "/awaiting-approval";
  if (isAdmin(p.role)) return "/teacher";
  return "/sessions";
}
```

`lib/auth/sync.ts` changes:
- Import `seedRoleForEmail` instead of `isTeacherEmail`.
- On insert: `role = seedRoleForEmail(email) ?? "student"`. `status = role !== "student" ? "approved" : "pending"`.
- On update: if `seedRoleForEmail(email)` returns a value AND the existing row's role doesn't match, update to the seed role and set `status='approved'`. (Re-assert the founder/co-founder seats every sign-in.)
- Other DB role values (president, VP, etc.) are never overwritten by sync.

### Dashboard guard

`lib/teacher/guard.ts` swaps the equality check:

```ts
import { isAdmin } from "@/lib/auth/profile";

// before
if (!profile || profile.role !== "teacher" || profile.status !== "approved") { ... }

// after
if (!profile || !isAdmin(profile.role) || profile.status !== "approved") { ... }
```

### Initials parser

New file `lib/auth/initials.ts`:

```ts
// YCDSB email format is firstname.lastname{year}@ycdsbk12.ca.
// For non-YCDSB or unparseable emails, fall back to first letter of email.
//
// Examples:
//   neil.moudgil27@ycdsbk12.ca   -> "NM"
//   ryan.lai27@ycdsbk12.ca       -> "RL"
//   foo@gmail.com                -> "F"
//   bar.baz@gmail.com            -> "BB"
export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local) return "?";
  // Strip trailing digits (the YCDSB graduation year). "moudgil27" -> "moudgil".
  const cleaned = local.replace(/\d+$/, "");
  const segments = cleaned.split(".").filter(Boolean);
  if (segments.length === 0) return "?";
  if (segments.length === 1) return segments[0]!.charAt(0).toUpperCase();
  return (segments[0]!.charAt(0) + segments[1]!.charAt(0)).toUpperCase();
}
```

### Avatar component

New file `components/public/UserAvatar.tsx`. Client component. Props: `email: string`, `role: RoleSlug`. Renders a 32px circle with two-letter initials and (on click) a dropdown anchored to its bottom-right.

- Circle: `width: 32, height: 32, borderRadius: 16, background: var(--neutral-0), border: 1px solid var(--neutral-200)`.
- Initials text: `var(--accent)` color, `font-weight: 600`, `font-size: 12`, centered.
- Dropdown card on click: `min-width: 240`, white background, neutral-200 border, light shadow, padding 12-16. Closes on outside click.
- Dropdown contents:
  - Top section: full name (from `email` parsing - "Neil Moudgil") in 14px semibold, role label below in 11px mono, neutral-500.
  - Divider (1px neutral-200).
  - If `role !== "student"`: a `<Link href="/teacher">→ Dashboard</Link>` row.
  - Divider.
  - Version block (mono 11px): "margin v3.1.0", "commit · 2d9cf53", "built · 2026-04-30".

Helper to derive a display name from the email: same parser, just capitalized words joined with a space ("neil.moudgil27" -> "Neil Moudgil").

Role labels for display (mapping enum -> human label):
- `founder` -> "Founder"
- `co-founder` -> "Co-Founder"
- `president` -> "President"
- `vice-president` -> "Vice President"
- `secretary` -> "Secretary"
- `treasurer` -> "Treasurer"
- `teacher-sponsor` -> "Teacher Sponsor"
- `student` -> "Student"

### TopNav integration

`components/public/TopNav.tsx` accepts two new optional props:

```ts
{
  current?: ...;
  signedIn: boolean;
  email?: string;
  role?: RoleSlug;
}
```

Signed-in branch becomes:

```tsx
<>
  {email && role && <UserAvatar email={email} role={role} />}
  <form action={signOut}>
    <Button type="submit" variant="ghost" size="sm">Sign out</Button>
  </form>
</>
```

Avatar sits to the left of "Sign out" with a small gap (existing `gap: 10` in the parent flex). All `<TopNav>` call sites get updated to pass `email` and `role` from `getCurrentProfile()`.

### Roster role dropdown

`app/teacher/roster/page.tsx` swaps the static `<span>{r.role}</span>` for a client `<RoleCell>` component that renders a `<select>` for the eight role values.

New file `components/public/RoleCell.tsx`:

```tsx
"use client";
// Inline role dropdown. On change: optimistic update + server action.
// On error: revert + log to console (no toast yet, YAGNI).
```

Props: `userId: string`, `currentRole: RoleSlug`. Render a native `<select>` styled to look like the existing role text - subtle until hover/focus shows the dropdown affordance. On change, submits to a new server action `updateUserRole(userId, newRole)`.

New server action file `app/teacher/roster/actions.ts`:

```ts
"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin, type RoleSlug } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: RoleSlug) {
  const me = await getCurrentProfile();
  if (!me || !isAdmin(me.role) || me.status !== "approved") {
    return { ok: false, error: "forbidden" };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher/roster");
  return { ok: true };
}
```

Note: the seed map (`EMAIL_TO_ROLE`) is enforced by `syncProfileForAuthUser` on every sign-in, so if an exec user accidentally demotes a founder via the dropdown, the next sign-in restores it. We do not block the action UI-side - that's intentional simplicity.

### Version display removal

`components/VersionBadge.tsx` is deleted. `app/layout.tsx` removes the `<VersionBadge />` mount and the import. Version info now lives only inside the avatar dropdown, behind sign-in.

## Risks and tradeoffs

- **Postgres enum cannot drop `teacher`.** Postgres enums don't support removing values without rebuilding the type. We accept that `'teacher'` will be a dead value forever; nothing assigns it, so it's harmless.
- **Founder/co-founder demotion via roster UI is reverted on next sign-in.** This is a feature, not a bug. If you really want to demote yourself or Ryan permanently, edit `EMAIL_TO_ROLE` in code and redeploy, then update via SQL.
- **No granular permissions among admin roles.** A treasurer can demote a founder via the UI (which gets reverted next sign-in if it's a seeded founder). For unseeded execs, demotion sticks. Acceptable for an 8-person club; revisit if it bites.
- **Initials parser falls back to first letter only for non-YCDSB emails.** Common case (gmail with no `.`) becomes a single letter. Fine for a demo flow.
- **Version is gated by sign-in.** Anonymous visitors no longer see the version. If a public-facing version display is later needed (for support / "what version are you on?"), the version constants are still exported from `lib/version.ts` and can be surfaced again on `/about` or similar.

## Acceptance criteria

1. The Postgres `profile_role` enum contains all 8 new values; `ryan.lai27@ycdsbk12.ca` is `co-founder` in the DB; `neil.moudgil27@ycdsbk12.ca` is `founder`.
2. `EMAIL_TO_ROLE` exists in `lib/auth/role-seeds.ts` with exactly the two seeds; `lib/auth/teachers.ts` is gone.
3. Signing in as Neil shows a circular avatar with "NM" to the left of the Sign out button in the TopNav. Clicking it opens a dropdown listing "Neil Moudgil", role "Founder", a "Dashboard" link, and a version block.
4. Signing in as a student-role test account shows the avatar with their initials, but the dropdown does NOT show the Dashboard link.
5. On `/teacher/roster`, the role cell is a `<select>` showing all 8 role values. Changing Ryan's role to `president` and refreshing his account session shows him with role "President" in his own avatar dropdown.
6. The bottom-right version dot is gone from every page. The version info lives only inside the avatar dropdown.
7. `lib/teacher/guard.ts` admits all non-`student` roles. A `treasurer` test account can access `/teacher`.
8. `npx tsc --noEmit` passes; `next build` succeeds; `grep -r "isTeacherEmail\|TEACHER_EMAILS" app/ components/ lib/` returns zero results.
9. No em-dashes introduced.
