import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdmin, type RoleSlug } from "@/lib/auth/role";

// Re-export for backwards compatibility with existing import paths.
// New client-side imports should pull from "@/lib/auth/role" directly so
// they don't transitively load next/headers via createSupabaseServerClient.
export { isAdmin, ADMIN_ROLES, ROLE_LABEL, type RoleSlug } from "@/lib/auth/role";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: RoleSlug;
  status: "pending" | "approved" | "rejected";
  cohort_year: number;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

// Fetches the current user's profile via RLS. Returns null if not signed in
// or if the profile row hasn't been created yet (race during sign-up).
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("getCurrentProfile:", error.message);
    return null;
  }
  return (data as Profile) ?? null;
}

// Determines where to send a user after sign-in/sign-up based on their
// profile state. Used by both the signIn and signUp server actions.
export function landingPathForProfile(p: Profile | null): string {
  if (!p) return "/awaiting-approval";
  if (p.status === "rejected") return "/access-denied";
  if (p.status === "pending") return "/awaiting-approval";
  if (isAdmin(p.role)) return "/teacher";
  return "/sessions";
}
