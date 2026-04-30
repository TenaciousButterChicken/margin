import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "student" | "teacher";
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
  if (p.role === "teacher") return "/teacher";
  return "/sessions";
}
