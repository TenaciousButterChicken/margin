import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isTeacherEmail } from "@/lib/auth/teachers";
import { cohortYearForDate } from "@/lib/auth/cohort";

// Ensures a profile row exists for the given auth user, with role/status
// kept in sync with TEACHER_EMAILS. Uses the service-role key — bypasses
// RLS. Server-only.
//
// Idempotent: safe to call on every sign-in.
//
// - First-time sign-up: inserts profile. role/status come from TEACHER_EMAILS.
// - Returning student: refreshes email (in case Supabase Auth has updated it).
// - Student promoted to teacher (added to TEACHER_EMAILS): updates role.
// - Teacher demoted (removed from TEACHER_EMAILS): NOT auto-demoted. Spec
//   intentionally requires manual SQL to demote, to prevent lockouts.

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

  const isTeacher = isTeacherEmail(email);

  if (!existing) {
    // First sign-in: insert.
    await admin.from("profiles").insert({
      id: authUser.id,
      email,
      full_name: authUser.user_metadata?.full_name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
      cohort_year: cohortYearForDate(new Date()),
      role: isTeacher ? "teacher" : "student",
      status: isTeacher ? "approved" : "pending",
      approved_at: isTeacher ? new Date().toISOString() : null,
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

  // Teacher promotion: if they're now a teacher but the row says student.
  if (isTeacher && (existing as { role: string }).role !== "teacher") {
    await admin
      .from("profiles")
      .update({
        role: "teacher",
        status: "approved",
        approved_at: new Date().toISOString(),
      } as never)
      .eq("id", authUser.id);
  }
}
