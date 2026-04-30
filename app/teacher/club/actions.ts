"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile";
import { SESSIONS } from "@/lib/sessions";
import { revalidatePath } from "next/cache";

export async function setCurrentSession(formData: FormData): Promise<void> {
  const me = await getCurrentProfile();
  if (!me || !isAdmin(me.role) || me.status !== "approved") {
    console.error("setCurrentSession: forbidden");
    return;
  }

  const raw = formData.get("slug");
  const slug = typeof raw === "string" && raw.length > 0 ? raw : null;

  // Validate that the slug matches a real session, or null to clear.
  if (slug !== null && !SESSIONS.some((s) => s.slug === slug)) {
    console.error("setCurrentSession: invalid slug", slug);
    return;
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("club_state")
    .update({
      current_session_slug: slug,
      updated_at: new Date().toISOString(),
      updated_by: me.id,
    })
    .eq("id", 1);

  if (error) {
    console.error("setCurrentSession:", error.message);
    return;
  }
  revalidatePath("/teacher/club");
  revalidatePath("/sessions");
}
