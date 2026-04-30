import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reads/writes the singleton club_state row. The "current session" is
// the session the founder is actively teaching biweekly; the public
// /sessions page and Sidebar use it to highlight what's next.

export async function getCurrentSessionSlug(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("club_state")
    .select("current_session_slug")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("getCurrentSessionSlug:", error.message);
    return null;
  }
  return (data as { current_session_slug: string | null } | null)?.current_session_slug ?? null;
}
