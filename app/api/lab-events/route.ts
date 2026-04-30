import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Records lab attempts. The Lab framework (June work per project plan) will
// call this endpoint when the "challenge passed" channel fires.
//
// Body: { session_id, lab_id, outcome, final_state? }
//   - outcome 'started':           INSERT new in_progress row
//   - outcome 'completed' / 'abandoned':
//       UPDATE the most recent in_progress row to that outcome.
//       If none exists, INSERT a new row already at that outcome.

type Outcome = "started" | "completed" | "abandoned";

export async function POST(request: NextRequest) {
  let body: {
    session_id?: string;
    lab_id?: string;
    outcome?: Outcome;
    final_state?: object | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.session_id || !body.lab_id || !body.outcome) {
    return NextResponse.json(
      { error: "session_id, lab_id, outcome required" },
      { status: 400 }
    );
  }
  if (!["started", "completed", "abandoned"].includes(body.outcome)) {
    return NextResponse.json({ error: "invalid outcome" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (body.outcome === "started") {
    const { error } = await supabase.from("lab_attempts").insert({
      user_id: user.id,
      session_id: body.session_id,
      lab_id: body.lab_id,
      outcome: "in_progress",
      final_state: body.final_state ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return new NextResponse(null, { status: 204 });
  }

  // completed | abandoned: find latest in_progress, update it; else insert.
  const { data: latest } = await supabase
    .from("lab_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("lab_id", body.lab_id)
    .eq("outcome", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const { error } = await supabase
      .from("lab_attempts")
      .update({
        outcome: body.outcome,
        ended_at: new Date().toISOString(),
        final_state: body.final_state ?? null,
      })
      .eq("id", latest.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  } else {
    const { error } = await supabase.from("lab_attempts").insert({
      user_id: user.id,
      session_id: body.session_id,
      lab_id: body.lab_id,
      outcome: body.outcome,
      ended_at: new Date().toISOString(),
      final_state: body.final_state ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return new NextResponse(null, { status: 204 });
}
