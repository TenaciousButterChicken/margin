import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Idempotent "I'm done with this chapter" marker.

export async function POST(request: NextRequest) {
  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("session_completions").upsert(
    { user_id: user.id, session_id: body.session_id },
    { onConflict: "user_id,session_id", ignoreDuplicates: true }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return new NextResponse(null, { status: 204 });
}
