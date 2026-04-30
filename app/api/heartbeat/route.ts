import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Heartbeat: client posts every 15s while the tab is visible. We compute a
// 15-second bucket on the server and upsert; the PK on
// (user_id, session_id, bucket_ts) makes multi-tab dedup automatic.
// RLS checks (user_id = auth.uid() AND is_approved()), so pending/rejected
// users 403 here without writes.

export async function POST(request: NextRequest) {
  let body: { session_id?: string; lab_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.session_id || typeof body.session_id !== "string") {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bucketMs = Math.floor(Date.now() / 15_000) * 15_000;
  const bucketTs = new Date(bucketMs).toISOString();

  const { error } = await supabase.from("session_heartbeats").upsert(
    {
      user_id: user.id,
      session_id: body.session_id,
      lab_id: body.lab_id ?? null,
      bucket_ts: bucketTs,
    },
    { onConflict: "user_id,session_id,bucket_ts", ignoreDuplicates: true }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return new NextResponse(null, { status: 204 });
}
