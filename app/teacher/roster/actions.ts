"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin, type RoleSlug } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

const VALID_ROLES: ReadonlyArray<RoleSlug> = [
  "student",
  "founder",
  "co-founder",
  "president",
  "vice-president",
  "secretary",
  "treasurer",
  "teacher-sponsor",
];

export async function updateUserRole(
  userId: string,
  newRole: RoleSlug,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Auth: caller must be an approved admin.
  const me = await getCurrentProfile();
  if (!me || !isAdmin(me.role) || me.status !== "approved") {
    return { ok: false, error: "forbidden" };
  }
  if (!VALID_ROLES.includes(newRole)) {
    return { ok: false, error: "invalid_role" };
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
