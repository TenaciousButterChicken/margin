"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/teacher/guard";

// Approve / reject server actions. The UPDATE policy on profiles is
// is_teacher(); since requireTeacher() gates the route already, we just
// run the UPDATE as the authenticated teacher.

export async function approveStudent(userId: string) {
  const teacher = await requireTeacher();
  const supabase = createSupabaseServerClient();

  await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: teacher.id,
    })
    .eq("id", userId)
    .eq("status", "pending"); // idempotent

  revalidatePath("/teacher", "layout");
}

export async function rejectStudent(userId: string) {
  await requireTeacher();
  const supabase = createSupabaseServerClient();

  await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userId);

  revalidatePath("/teacher", "layout");
}

export async function approveAllPending() {
  const teacher = await requireTeacher();
  const supabase = createSupabaseServerClient();

  await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: teacher.id,
    })
    .eq("status", "pending");

  revalidatePath("/teacher", "layout");
}
