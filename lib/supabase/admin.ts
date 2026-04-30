import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key.
// Bypasses Row Level Security — use ONLY for trusted writes that no
// authenticated user could perform on their own behalf (profile creation,
// teacher promotion).
//
// MUST never be imported into a client component or any code that ships
// to the browser. The key gives full DB access.

let cached: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createSupabaseAdminClient: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
