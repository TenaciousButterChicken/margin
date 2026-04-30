import { notFound } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile";

// Server-side guard for /teacher/* routes. Returns the teacher profile if
// the caller is one; otherwise calls notFound() (404). We use 404 instead of
// 403 so the dashboard's existence isn't advertised to non-teachers.

export async function requireTeacher() {
  const profile = await getCurrentProfile();
  if (!profile || !isAdmin(profile.role) || profile.status !== "approved") {
    notFound();
  }
  return profile;
}
