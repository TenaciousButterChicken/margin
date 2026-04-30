import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { seedRoleForEmail } from "@/lib/auth/role-seeds";
import { cohortYearForDate } from "@/lib/auth/cohort";

// Ensures a profile row exists for the given auth user, with role/status
// kept in sync with EMAIL_TO_ROLE. Uses the service-role key - bypasses
// RLS. Server-only.
//
// Idempotent: safe to call on every sign-in.
//
// - First-time sign-up: inserts profile. role/status come from EMAIL_TO_ROLE.
// - Returning user: refreshes email/full_name/avatar_url.
// - Seeded promotion: if their email is in EMAIL_TO_ROLE but the row's role
//   doesn't match, we update to the seed role and set status='approved'.
//   (This re-asserts the founder/co-founder seats on every sign-in - the
//   anti-lockout safety net.)
// - Other roles (president, VP, secretary, treasurer, teacher-sponsor) are
//   never overwritten by sync. Those come from the roster UI.

export async function syncProfileForAuthUser(authUser: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; avatar_url?: string };
}): Promise<void> {
  if (!authUser.email) return;
  const email = authUser.email.toLowerCase();
  const admin = createSupabaseAdminClient();

  // Look up existing profile.
  const { data: existing } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", authUser.id)
    .maybeSingle();

  const seedRole = seedRoleForEmail(email);

  if (!existing) {
    // First sign-in: insert.
    await admin.from("profiles").insert({
      id: authUser.id,
      email,
      full_name: authUser.user_metadata?.full_name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
      cohort_year: cohortYearForDate(new Date()),
      role: seedRole ?? "student",
      status: seedRole ? "approved" : "pending",
      approved_at: seedRole ? new Date().toISOString() : null,
    } as never);
    return;
  }

  // Returning user: refresh email/full_name/avatar_url.
  await admin
    .from("profiles")
    .update({
      email,
      full_name: authUser.user_metadata?.full_name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
    } as never)
    .eq("id", authUser.id);

  // Seeded role re-assertion: if the seed map says X but the row says Y, fix it.
  if (seedRole && (existing as { role: string }).role !== seedRole) {
    await admin
      .from("profiles")
      .update({
        role: seedRole,
        status: "approved",
        approved_at: new Date().toISOString(),
      } as never)
      .eq("id", authUser.id);
  }
}
