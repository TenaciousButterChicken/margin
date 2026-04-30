import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/profile";

// Server-side data fetchers for the teacher dashboard. All run as the
// authenticated teacher; RLS allows is_teacher() to read everyone's rows.

export type RosterRow = Profile & {
  sessions_completed: number;
  total_minutes: number;
  last_seen: string | null;
};

export async function getRoster(): Promise<RosterRow[]> {
  const supabase = createSupabaseServerClient();

  const [{ data: profiles }, { data: completions }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("session_completions").select("user_id, session_id"),
    supabase.from("session_progress").select("user_id, total_seconds, last_visited_at"),
  ]);

  const completionsByUser = new Map<string, number>();
  for (const c of completions ?? []) {
    completionsByUser.set(c.user_id, (completionsByUser.get(c.user_id) ?? 0) + 1);
  }

  const totalsByUser = new Map<string, { seconds: number; lastSeen: string | null }>();
  for (const p of progress ?? []) {
    const cur = totalsByUser.get(p.user_id) ?? { seconds: 0, lastSeen: null };
    cur.seconds += p.total_seconds ?? 0;
    if (!cur.lastSeen || (p.last_visited_at && p.last_visited_at > cur.lastSeen)) {
      cur.lastSeen = p.last_visited_at;
    }
    totalsByUser.set(p.user_id, cur);
  }

  return (profiles ?? []).map((p) => ({
    ...(p as Profile),
    sessions_completed: completionsByUser.get(p.id) ?? 0,
    total_minutes: Math.round((totalsByUser.get(p.id)?.seconds ?? 0) / 60),
    last_seen: totalsByUser.get(p.id)?.lastSeen ?? null,
  }));
}

export type OverviewStats = {
  total_members: number;
  approved_members: number;
  pending: number;
  rejected: number;
  active_this_week: number;
  total_minutes_cohort: number;
  sessions_completed_cohort: number;
  lab_attempts_total: number;
  hints_this_month: number;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createSupabaseServerClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    membersTotal,
    membersApproved,
    membersPending,
    membersRejected,
    activeUsers,
    progress,
    completions,
    labAttempts,
    hintsMonth,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("session_heartbeats").select("user_id").gte("bucket_ts", oneWeekAgo),
    supabase.from("session_progress").select("total_seconds"),
    supabase.from("session_completions").select("user_id", { count: "exact", head: true }),
    supabase.from("lab_attempts").select("id", { count: "exact", head: true }),
    supabase.from("hint_usage").select("id", { count: "exact", head: true }).gte("requested_at", monthStart.toISOString()),
  ]);

  const activeSet = new Set((activeUsers.data ?? []).map((r) => r.user_id));
  const totalSeconds = (progress.data ?? []).reduce(
    (sum, r) => sum + ((r as { total_seconds: number }).total_seconds ?? 0),
    0
  );

  return {
    total_members: membersTotal.count ?? 0,
    approved_members: membersApproved.count ?? 0,
    pending: membersPending.count ?? 0,
    rejected: membersRejected.count ?? 0,
    active_this_week: activeSet.size,
    total_minutes_cohort: Math.round(totalSeconds / 60),
    sessions_completed_cohort: completions.count ?? 0,
    lab_attempts_total: labAttempts.count ?? 0,
    hints_this_month: hintsMonth.count ?? 0,
  };
}

export type SessionAggregate = {
  session_id: string;
  students_visited: number;
  students_completed: number;
  total_minutes: number;
  avg_minutes: number;
  // distribution: 6 buckets - 0-5, 5-10, 10-20, 20-30, 30-60, 60+ minutes
  histogram: { label: string; count: number }[];
};

// Aggregate stats for ALL sessions (for the sessions index page).
export async function getAllSessionAggregates(): Promise<Map<string, SessionAggregate>> {
  const supabase = createSupabaseServerClient();

  const [{ data: progress }, { data: completions }] = await Promise.all([
    supabase.from("session_progress").select("user_id, session_id, total_seconds"),
    supabase.from("session_completions").select("user_id, session_id"),
  ]);

  const bySession = new Map<string, { users: Set<string>; total_seconds: number; minutes: number[] }>();
  for (const p of progress ?? []) {
    const r = p as { user_id: string; session_id: string; total_seconds: number };
    const cur = bySession.get(r.session_id) ?? { users: new Set(), total_seconds: 0, minutes: [] };
    cur.users.add(r.user_id);
    cur.total_seconds += r.total_seconds ?? 0;
    cur.minutes.push((r.total_seconds ?? 0) / 60);
    bySession.set(r.session_id, cur);
  }

  const completedBySession = new Map<string, Set<string>>();
  for (const c of completions ?? []) {
    const r = c as { user_id: string; session_id: string };
    const set = completedBySession.get(r.session_id) ?? new Set();
    set.add(r.user_id);
    completedBySession.set(r.session_id, set);
  }

  const out = new Map<string, SessionAggregate>();
  for (const [session_id, stats] of Array.from(bySession.entries())) {
    out.set(session_id, {
      session_id,
      students_visited: stats.users.size,
      students_completed: completedBySession.get(session_id)?.size ?? 0,
      total_minutes: Math.round(stats.total_seconds / 60),
      avg_minutes: stats.users.size > 0 ? Math.round(stats.total_seconds / 60 / stats.users.size) : 0,
      histogram: bucketize(stats.minutes),
    });
  }
  return out;
}

// Aggregate stats for ONE session (per-session detail page).
export async function getSessionAggregate(sessionId: string): Promise<SessionAggregate & {
  students: Array<{ user_id: string; email: string; minutes: number; completed_at: string | null }>;
}> {
  const supabase = createSupabaseServerClient();

  const [{ data: progress }, { data: completions }, { data: profiles }] = await Promise.all([
    supabase
      .from("session_progress")
      .select("user_id, total_seconds, last_visited_at")
      .eq("session_id", sessionId),
    supabase.from("session_completions").select("user_id, completed_at").eq("session_id", sessionId),
    supabase.from("profiles").select("id, email"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [(p as { id: string; email: string }).id, (p as { id: string; email: string }).email]));
  const completionMap = new Map((completions ?? []).map((c) => [(c as { user_id: string; completed_at: string }).user_id, (c as { user_id: string; completed_at: string }).completed_at]));

  const minutesArr = (progress ?? []).map((p) => ((p as { total_seconds: number }).total_seconds ?? 0) / 60);
  const totalSeconds = (progress ?? []).reduce(
    (sum, p) => sum + ((p as { total_seconds: number }).total_seconds ?? 0),
    0
  );

  const students = (progress ?? []).map((p) => {
    const r = p as { user_id: string; total_seconds: number };
    return {
      user_id: r.user_id,
      email: profileMap.get(r.user_id) ?? "(unknown)",
      minutes: Math.round((r.total_seconds ?? 0) / 60),
      completed_at: completionMap.get(r.user_id) ?? null,
    };
  });

  return {
    session_id: sessionId,
    students_visited: progress?.length ?? 0,
    students_completed: completions?.length ?? 0,
    total_minutes: Math.round(totalSeconds / 60),
    avg_minutes: progress && progress.length > 0 ? Math.round(totalSeconds / 60 / progress.length) : 0,
    histogram: bucketize(minutesArr),
    students,
  };
}

function bucketize(minutes: number[]): { label: string; count: number }[] {
  const buckets = [
    { label: "0–5", min: 0, max: 5 },
    { label: "5–10", min: 5, max: 10 },
    { label: "10–20", min: 10, max: 20 },
    { label: "20–30", min: 20, max: 30 },
    { label: "30–60", min: 30, max: 60 },
    { label: "60+", min: 60, max: Infinity },
  ];
  return buckets.map((b) => ({
    label: b.label,
    count: minutes.filter((m) => m >= b.min && m < b.max).length,
  }));
}

export type HintRow = {
  user_id: string;
  email: string;
  hints_this_month: number;
  ai_hints_this_month: number;
};

export async function getHintQuotaTable(): Promise<HintRow[]> {
  const supabase = createSupabaseServerClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: profiles }, { data: hints }] = await Promise.all([
    supabase.from("profiles").select("id, email").order("email"),
    supabase
      .from("hint_usage")
      .select("user_id, hint_type")
      .gte("requested_at", monthStart.toISOString()),
  ]);

  const totalByUser = new Map<string, { all: number; ai: number }>();
  for (const h of hints ?? []) {
    const r = h as { user_id: string; hint_type: string };
    const cur = totalByUser.get(r.user_id) ?? { all: 0, ai: 0 };
    cur.all++;
    if (r.hint_type === "ai") cur.ai++;
    totalByUser.set(r.user_id, cur);
  }

  return (profiles ?? []).map((p) => {
    const r = p as { id: string; email: string };
    const t = totalByUser.get(r.id) ?? { all: 0, ai: 0 };
    return {
      user_id: r.id,
      email: r.email,
      hints_this_month: t.all,
      ai_hints_this_month: t.ai,
    };
  });
}

export type StudentDetail = {
  profile: Profile;
  sessions: Array<{
    session_id: string;
    first_visited_at: string | null;
    last_visited_at: string | null;
    total_seconds: number;
    completed_at: string | null;
  }>;
  lab_attempts: Array<{
    id: string;
    session_id: string;
    lab_id: string;
    started_at: string;
    ended_at: string | null;
    outcome: string;
  }>;
  hints: Array<{
    id: string;
    session_id: string | null;
    lab_id: string | null;
    hint_type: string;
    prompt: string | null;
    requested_at: string;
  }>;
  // Daily activity for the last 30 days: { date: 'YYYY-MM-DD', minutes }
  daily_activity: Array<{ date: string; minutes: number }>;
};

export async function getStudentDetail(userId: string): Promise<StudentDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: sessions }, { data: labs }, { data: hints }, { data: heartbeats }] =
    await Promise.all([
      supabase
        .from("session_progress")
        .select("session_id, first_visited_at, last_visited_at, total_seconds, completed_at")
        .eq("user_id", userId)
        .order("first_visited_at", { ascending: true }),
      supabase
        .from("lab_attempts")
        .select("id, session_id, lab_id, started_at, ended_at, outcome")
        .eq("user_id", userId)
        .order("started_at", { ascending: false }),
      supabase
        .from("hint_usage")
        .select("id, session_id, lab_id, hint_type, prompt, requested_at")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false }),
      supabase
        .from("session_heartbeats")
        .select("bucket_ts")
        .eq("user_id", userId)
        .gte("bucket_ts", thirtyDaysAgo.toISOString()),
    ]);

  // Build the daily activity series - 30 days, even when zero.
  const activityByDate = new Map<string, number>();
  for (const h of heartbeats ?? []) {
    const ts = (h as { bucket_ts: string }).bucket_ts;
    const date = ts.slice(0, 10); // YYYY-MM-DD
    activityByDate.set(date, (activityByDate.get(date) ?? 0) + 15);
  }
  const dailyActivity: Array<{ date: string; minutes: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyActivity.push({ date: key, minutes: Math.round((activityByDate.get(key) ?? 0) / 60) });
  }

  return {
    profile: profile as Profile,
    sessions: (sessions ?? []) as StudentDetail["sessions"],
    lab_attempts: (labs ?? []) as StudentDetail["lab_attempts"],
    hints: (hints ?? []) as StudentDetail["hints"],
    daily_activity: dailyActivity,
  };
}
