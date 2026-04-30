"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isYcdsbEmail } from "@/lib/auth/domain";
import { syncProfileForAuthUser } from "@/lib/auth/sync";
import { getCurrentProfile, landingPathForProfile } from "@/lib/auth/profile";

export type AuthState = { error?: string };

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  // Re-sync profile on every sign-in (refreshes email, applies teacher promotion).
  if (data.user) await syncProfileForAuthUser(data.user);

  const profile = await getCurrentProfile();
  revalidatePath("/", "layout");
  redirect(landingPathForProfile(profile));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!isYcdsbEmail(email)) {
    return { error: "Please use your @ycdsbk12.ca school email." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  if (data.user) await syncProfileForAuthUser(data.user);

  const profile = await getCurrentProfile();
  revalidatePath("/", "layout");
  redirect(landingPathForProfile(profile));
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
