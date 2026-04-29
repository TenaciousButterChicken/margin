# Auth + Teacher Dashboard

**Status:** Design (2026-04-29)
**Repo:** margin (Next.js + Supabase + Pyodide stack)

## What we're building

Margin currently has a sign-in / sign-up scaffold with Supabase email + password. It doesn't actually work for the use case: students sign in with school Google accounts (`@ycdsbk12.ca`), and the school's email setup blocks most external mail — so confirmation links and password resets won't reach them.

Two goals:

1. **Make sign-in work for school accounts.** Use Google Sign-In, no passwords on our side.
2. **Give the teacher (Neil) a dashboard** showing every student, who's approved, time on each session, lab attempts, hint usage, and so on.

Plus one safety mechanism: anyone with a YCDSB Google account can sign in (the district has tens of thousands of users, way more than the 16 in the club), so new accounts land in a `pending` state. The teacher approves or rejects them from the dashboard.

## How we're rolling it out

Three phases, plus a Phase 0 prototype to de-risk the unknown.

The unknown: we don't actually know if YCDSB's Google Workspace allows third-party OAuth consent. Some school IT departments block it. The only way to find out is to try it. Phase 0 is the smallest possible thing that proves it works — sign in, see your email, sign out. If it works, we keep going. If it doesn't, we pivot to autoconfirm email/password and the rest of the design carries over with a different auth provider.

### Phase 0 — OAuth validation prototype (the gate)

Goal: confirm a YCDSB account can complete a Google OAuth flow into our app.

Build:
- Set up Google Cloud OAuth client (Web application) and Supabase Google provider.
- Replace the existing email/password sign-in form with a single **Sign in with Google** button.
- `/auth/callback` route that calls `supabase.auth.exchangeCodeForSession(code)` (Supabase's PKCE flow returns the OAuth code as a query param to our callback; we exchange it server-side, which sets the session cookie).
- Server-side domain check: if the user's email doesn't end in `@ycdsbk12.ca`, sign them out and bounce them to `/sign-in?error=domain`.
- Stub `/me` page that displays `Hello, {email}` and a sign-out button.

**Pass condition:** Neil signs in as `neil.moudgil27@ycdsbk12.ca` from the live Pi deploy and lands on `/me`.

**If Phase 0 fails:** Pivot. Switch to Supabase email/password with email confirmation **disabled** (autoconfirm). Add domain check to the sign-up form server action. Everything from Phase 1 onward stays the same — schema, RLS, tracking, dashboard. The only differences are the sign-in page (form instead of button) and the lack of `avatar_url` / `full_name` from Google (we'd ask for `full_name` on a one-time profile setup page).

### Phase 1 — Profiles, roles, approval flow

Build:
- `profiles` table (see Schema section).
- `lib/auth/teachers.ts` exporting `TEACHER_EMAILS = ["neil.moudgil27@ycdsbk12.ca"]`.
- `lib/auth/cohort.ts` exporting `cohortYearForDate(d: Date): number` — returns the calendar year if the month is August or later, otherwise the prior year. (School year boundary.)
- OAuth callback handler does a profile upsert: inserts on first sign-in, updates `email` / `full_name` / `avatar_url` on every sign-in (in case they changed at Google's end), re-syncs `role` from `TEACHER_EMAILS` (so promoting an existing student to teacher works without manual SQL).
- `/awaiting-approval` page (rendered for any pending student that hits a gated route).
- `/access-denied` page (for rejected users).
- RLS policies on `profiles`.

For Phase 1, approving students is done by Neil running a SQL update from the Supabase dashboard. The dashboard UI for approve/reject comes in Phase 3. This keeps Phase 1 tight.

### Phase 2 — Tracking instrumentation

Build:
- `session_heartbeats`, `session_completions`, `lab_attempts`, `hint_usage` tables.
- `session_progress` view joining heartbeats and completions.
- `<TimeOnPage sessionId labId?>` client component, mounted on each session and lab page. Heartbeats every 15s while the tab is visible; final beacon on `pagehide` and `visibilitychange→hidden`.
- API routes: `/api/heartbeat`, `/api/lab-events`, `/api/session-progress/complete`.
- Hint quota check in the AI hint endpoint (whenever that endpoint exists; the schema and quota logic are ready for it).
- RLS on all four data tables.

The `/api/lab-events` contract is defined here, but the *publishers* of those events — the lab widgets — don't exist yet. Per the project plan, the Lab framework is June work. The events API is buildable today; the widgets will call it once they're written.

### Phase 3 — Teacher dashboard

Build:
- `/teacher` overview (cards + recent activity feed).
- `/teacher/roster` (sortable table, inline approve/reject, bulk approve, CSV export).
- `/teacher/roster/[user_id]` (per-student detail).
- `/teacher/sessions/[session_id]` (per-session aggregate, histogram, CSV export).
- `/teacher/hints` (quota usage by student-month).

All `/teacher/*` routes return 404 for non-teachers (surface invisibility — students don't see "forbidden" pages they could try to probe).

## Schema

Five tables. RLS enabled on all five.

```sql
-- 1. profiles
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  avatar_url   text,
  role         text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  cohort_year  int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  approved_at  timestamptz,
  approved_by  uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. session_heartbeats — raw bucket data; PK auto-dedupes multi-tab
CREATE TABLE session_heartbeats (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  lab_id     text,
  bucket_ts  timestamptz NOT NULL,
  PRIMARY KEY (user_id, session_id, bucket_ts)
);
CREATE INDEX session_heartbeats_user_session_idx
  ON session_heartbeats (user_id, session_id);

-- 3. session_completions — explicit "I'm done" markers, idempotent inserts
CREATE TABLE session_completions (
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id   text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

-- 4. lab_attempts — append-only event log
CREATE TABLE lab_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  lab_id      text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  outcome     text NOT NULL DEFAULT 'in_progress'
              CHECK (outcome IN ('in_progress','completed','abandoned')),
  final_state jsonb CHECK (octet_length(final_state::text) <= 16384)
);
CREATE INDEX lab_attempts_user_lab_idx ON lab_attempts (user_id, lab_id);

-- 5. hint_usage — append-only with generated month bucket
CREATE TABLE hint_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id   text,
  lab_id       text,
  widget_id    text,
  hint_type    text NOT NULL CHECK (hint_type IN ('hardcoded','ai')),
  prompt       text,
  response     text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  month_bucket text GENERATED ALWAYS AS (to_char(requested_at, 'YYYY-MM')) STORED
);
CREATE INDEX hint_usage_user_month_idx ON hint_usage (user_id, month_bucket);

-- session_progress: VIEW joining heartbeats + completions
CREATE VIEW session_progress AS
SELECT
  h.user_id,
  h.session_id,
  MIN(h.bucket_ts)                         AS first_visited_at,
  MAX(h.bucket_ts) + INTERVAL '15 seconds' AS last_visited_at,
  COUNT(*) * 15                            AS total_seconds,
  c.completed_at
FROM session_heartbeats h
LEFT JOIN session_completions c USING (user_id, session_id)
GROUP BY h.user_id, h.session_id, c.completed_at;
```

### RLS policies

Two helpers (security-definer so they don't recurse against their own policies):

```sql
CREATE FUNCTION is_teacher() RETURNS bool
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role = 'teacher' FROM profiles WHERE id = auth.uid()
$$;

CREATE FUNCTION is_approved() RETURNS bool
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT status = 'approved' FROM profiles WHERE id = auth.uid()
$$;
```

Per-table policies:

- **`profiles`**
  - SELECT: `id = auth.uid() OR is_teacher()`
  - UPDATE: RLS policy `USING (is_teacher())` so only teachers can update at all. To stop a teacher from accidentally editing email/name/avatar (those should only flow from Google), pair RLS with **column grants** (a separate Postgres mechanism): `REVOKE UPDATE ON profiles FROM authenticated; GRANT UPDATE (status, role, approved_at, approved_by) ON profiles TO authenticated;`. Net effect: only teachers, only those four columns. Email/name/avatar updates flow through the OAuth callback's service-role write, which bypasses both.
  - INSERT: blocked from clients. The OAuth callback writes profiles using the Supabase **service-role key** — a separate, server-only client that bypasses RLS for trusted writes.

- **`session_heartbeats`, `session_completions`, `lab_attempts`, `hint_usage`** (same shape for all four):
  - SELECT: `user_id = auth.uid() OR is_teacher()`
  - INSERT: `user_id = auth.uid() AND is_approved()`
  - UPDATE (where applicable, e.g. `lab_attempts`): `user_id = auth.uid() AND is_approved()`

## API contracts

### `POST /api/heartbeat`

Called by `<TimeOnPage>`. Body: `{ session_id: string, lab_id?: string }`.

Server logic:
1. Verify `is_approved()`. If not, 403.
2. Compute bucket: `bucket_ts = to_timestamp(floor(extract(epoch FROM now()) / 15) * 15)`.
3. `INSERT INTO session_heartbeats (user_id, session_id, lab_id, bucket_ts) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, session_id, bucket_ts) DO NOTHING`.
4. Return 204.

Client doesn't supply timestamps — server is authoritative. ON CONFLICT handles multi-tab dedup automatically.

### `POST /api/lab-events`

Called by lab widgets (Phase 2 wiring — the widgets themselves come later). Body: `{ session_id, lab_id, outcome: 'started' | 'completed' | 'abandoned', final_state?: object }`.

Server logic:
- `started` → INSERT a new row with `outcome='in_progress'`.
- `completed` / `abandoned` → UPDATE the most recent `in_progress` row for `(user_id, lab_id)` to set `outcome` and `ended_at`. If no in-progress row exists, INSERT a new one with the given outcome.
- Idempotent: re-firing `completed` on a row already completed updates `ended_at` to now (harmless) and is otherwise a no-op.
- `final_state` larger than 16KB → 400 (the CHECK constraint will reject it anyway, but we fail fast).

### `POST /api/session-progress/complete`

Body: `{ session_id }`.

`INSERT INTO session_completions (user_id, session_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`.

Idempotent. Triggered by an explicit "Mark complete" button at the end of each chapter, plus auto-fired when a session's boss lab completes (in Phase 2 once that wiring exists).

### Hint endpoint quota check

The AI hint endpoint (whenever it gets built) does this in a single transaction:

```sql
-- pre-flight
SELECT count(*) FROM hint_usage
WHERE user_id = auth.uid()
  AND month_bucket = to_char(now(), 'YYYY-MM')
  AND hint_type = 'ai';

-- if >= 30: return 429
-- else: serve the hint, then INSERT the row
```

Hardcoded hints don't count toward the quota and are always served.

## OAuth callback handler

The only place `profiles` rows are written.

```ts
// app/auth/callback/route.ts (pseudocode — service-role client = `admin`)
GET handler(request):
  const code = request.searchParams.get("code")
  await supabase.auth.exchangeCodeForSession(code)   // sets session cookie
  const { data: { user } } = await supabase.auth.getUser()

  const isTeacher = TEACHER_EMAILS.includes(user.email)
  const isYcdsb   = user.email.endsWith("@ycdsbk12.ca")

  if (!isYcdsb && !isTeacher) {
    await supabase.auth.signOut()
    return redirect("/sign-in?error=domain")
  }

  // Upsert profile.
  // - On INSERT: role/status get table defaults (student/pending). For a new
  //   teacher, the next block flips them. For a new student, defaults are
  //   what we want.
  // - On UPDATE: only the listed columns are touched; existing role/status
  //   are preserved (so an approved student stays approved on next sign-in).
  await admin.from("profiles").upsert({
    id:          user.id,
    email:       user.email,
    full_name:   user.user_metadata.full_name ?? null,
    avatar_url:  user.user_metadata.avatar_url ?? null,
    cohort_year: cohortYearForDate(new Date()),
  }, { onConflict: "id" })

  // Teacher promotion / sync. Idempotent: the .neq filter makes this a no-op
  // for someone who's already a teacher.
  if (isTeacher) {
    await admin.from("profiles")
      .update({ role: "teacher", status: "approved" })
      .eq("id", user.id)
      .neq("role", "teacher")
  }

  // Redirect based on current state (re-fetch to see the post-promotion row).
  const { data: profile } = await admin.from("profiles")
    .select("role, status").eq("id", user.id).single()
  if (profile.role === "teacher")     return redirect("/teacher")
  if (profile.status === "approved")  return redirect("/sessions")
  if (profile.status === "pending")   return redirect("/awaiting-approval")
  if (profile.status === "rejected")  return redirect("/access-denied")
```

## Decisions made (and why)

These are technical calls I made because they're plumbing-level and didn't need user input. Documented for traceability.

- **Heartbeats as rows, not as a counter.** A counter (`total_seconds += 15`) double-counts when two tabs are open. Storing each 15-second bucket as a row with a primary key on `(user_id, session_id, bucket_ts)` gives free dedup via `ON CONFLICT DO NOTHING`. Time totals are computed by `COUNT(*) * 15`. Row volume is fine — even at 4 hr/day across 16 students for a year, well under 100K rows.
- **`session_progress` is a view, not a table.** No rollup writes to keep in sync. Slightly slower reads, much simpler invariants.
- **Profile creation in TS (callback handler), not as a Postgres trigger.** A SQL trigger can't read the `TEACHER_EMAILS` constant. There's also a race where Supabase issues the session before a trigger commits. The callback handles both cleanly.
- **Role re-sync on every sign-in.** Adding someone to `TEACHER_EMAILS` after they've already signed up should promote them. The cost is one extra UPDATE per sign-in (cheap).
- **404 instead of 403 for non-teacher hitting `/teacher/*`.** The teacher dashboard's existence shouldn't be advertised to non-teachers.
- **No `attempt_number` column on `lab_attempts`.** Computed at read time with `ROW_NUMBER() OVER (PARTITION BY user_id, lab_id ORDER BY started_at)`. One less column to keep correct.
- **`month_bucket` as a generated column on `hint_usage`.** Always derived from `requested_at`; no client/server can mess it up.
- **`final_state` jsonb capped at 16KB.** Prevents accidental megabyte payloads from a buggy lab widget.
- **No automatic "abandoned" sweeper.** Lab attempts that go stale stay `in_progress`. Adding a job to mark them abandoned isn't worth the complexity for v1. The dashboard treats `in_progress` as "currently working" and that's fine.
- **Domain check both client-side (Google `hd` param) and server-side (callback handler).** The `hd` param is just a UX hint to pre-filter Google's account picker; the server check is what actually enforces it.

## Edge cases handled

- **Non-YCDSB Google account signs in.** Server-side check, signed out, redirected to `/sign-in?error=domain`.
- **Email or name changed at Google's end.** Callback re-upserts on every sign-in, profile stays current.
- **Pending student hits a gated page.** Server-side: redirect to `/awaiting-approval`. Pending student hits a gated API: 403 (RLS enforces it; the API handler also checks early for a clean message).
- **Approved → rejected → re-approved.** Just status flips. RLS denies further inserts when `status='rejected'`; old data is preserved either way.
- **Teacher promoted from a student.** Email added to `TEACHER_EMAILS`; on next sign-in, role updates to `teacher` and `status` flips to `approved`.
- **Multi-tab heartbeats.** PK constraint dedupes; total time is correct.
- **Tab close mid-session.** `sendBeacon` on `pagehide` and `visibilitychange→hidden` fires a final heartbeat for the trailing window.
- **Approval clicked twice.** `UPDATE ... WHERE status='pending'` — second click affects 0 rows.
- **Hint quota at boundary.** 29 hints used → ok; 30 → 429 with a "you've used your monthly AI hints" message; hardcoded hints unaffected.
- **`final_state` payload too big.** CHECK constraint rejects the row. Client should truncate before send; if it doesn't, the error surfaces clearly.
- **Profile upsert fails after OAuth succeeds (rare).** `/awaiting-approval` page renders a fallback "We're setting up your account, refresh in a moment" if the row is missing. The next request retries the upsert.
- **`/auth/callback` itself fails (token exchange error).** Redirect to `/sign-in?error=oauth` with the error code displayed.

## Testing

### Unit
- `cohortYearForDate(d)` — boundary tests around July 31 and August 1.
- OAuth callback handler — five cases:
  1. New `@ycdsbk12.ca` student → profile created with `status=pending`, `role=student`.
  2. New email in `TEACHER_EMAILS` → profile created with `status=approved`, `role=teacher`.
  3. Existing student signs in → no duplicate row, fields refreshed.
  4. Existing student whose email is added to `TEACHER_EMAILS` → role updated to `teacher` on this sign-in.
  5. Non-`@ycdsbk12.ca` and not in `TEACHER_EMAILS` → signed out + redirect.
- Heartbeat bucket math — given a fixed `now()`, bucket falls on the right 15-second boundary.
- Hint quota check at 29 (allow), 30 (deny).
- `lab-events` idempotency — re-firing `completed` doesn't create a duplicate row.

### Integration (Supabase local)

The load-bearing security test:

- **Two-student RLS regression.** Spin up two test users (A and B), both `status='approved'`, `role='student'`. Insert `session_heartbeats` rows for both. Sign in as A. Confirm:
  - `SELECT * FROM session_heartbeats` returns only A's rows.
  - `INSERT INTO session_heartbeats (user_id, ...) VALUES (B.id, ...)` is rejected by RLS.
  - Same checks for `session_completions`, `lab_attempts`, `hint_usage`, `profiles`.

Other integration tests:
- Pending student → `/api/heartbeat` returns 403 with no DB write.
- Teacher approving a pending student via SQL update → student's next API call succeeds.
- Multi-tab heartbeat dedup: two clients heartbeat same bucket simultaneously; `session_heartbeats` ends up with exactly one row.

### Manual smoke (post-deploy)

After Phase 0:
- Sign in with `neil.moudgil27@ycdsbk12.ca` from `https://margin.school` → land on `/me`.

After Phase 1:
- Sign in with the teacher account → role flips to `teacher`, redirected to `/teacher` (which 404s until Phase 3, that's fine).
- Sign in with a test student account → land on `/awaiting-approval`.
- Approve via SQL update → next sign-in lands on `/sessions`.

After Phase 2:
- Open Session 1 in two tabs for 2 minutes → query `session_progress` view, total_seconds should be ~120, not ~240.

After Phase 3:
- Whole flow end-to-end: pending student visible in roster, click approve, student gains access, teacher sees them in roster as approved with last_seen recent.

## Ops checklist (the rollout-fragile bit)

This is the part most likely to bite. Doing it as part of Phase 0 surfaces problems immediately.

1. **Google Cloud project**
   - Create OAuth 2.0 Client ID, type "Web application".
   - Authorized JavaScript origins: `https://margin.school`, `http://localhost:3000`.
   - Authorized redirect URIs: `https://<supabase-project>.supabase.co/auth/v1/callback` (Supabase's callback, not ours; Supabase does the code exchange and then redirects to our callback).

2. **OAuth consent screen**
   - User Type: **External**. (We don't own the YCDSB Workspace, so "Internal" isn't an option.)
   - Add the 16 student emails as Test Users — under 100 testers, no Google verification required, no friction.
   - App scopes: `openid`, `email`, `profile`.

3. **Supabase config**
   - Authentication → Providers → Google → enable, paste Client ID and Secret.
   - In our Next.js code, the `signInWithOAuth` call passes `queryParams: { hd: "ycdsbk12.ca" }` so Google's account picker pre-filters to school accounts. Server still re-verifies — `hd` is a UX hint, not enforcement.
   - URL config: Site URL = `https://margin.school`. Additional Redirect URLs = `http://localhost:3000/**`.

4. **Database migrations**
   - We're using **Supabase Cloud** (the hosted instance — confirmed by the existing scaffold's use of `NEXT_PUBLIC_SUPABASE_URL` pointing at `*.supabase.co`). Not self-hosting the DB on the Pi.
   - Migrations live in `supabase/migrations/` in the repo (directory created as part of Phase 1).
   - Applied via the Supabase CLI: `supabase db push` from a logged-in dev machine. Alternative for one-off fixes: paste SQL into the Supabase dashboard's SQL editor.

5. **RLS**
   - `ENABLE ROW LEVEL SECURITY` on all five tables before first deploy.
   - The two-student integration test must pass before each deploy that touches RLS.

6. **`/privacy` page**
   - Documents what's tracked (email, time on pages, lab attempts, hints), retention (kept while account exists, deleted on request), no third-party sharing.
   - Linked from the sign-in page.

## Residual risks (the things a design alone can't solve)

1. **YCDSB IT might block third-party OAuth consent.** Untestable from outside. Phase 0 is exactly the test. If it fails, fall back to autoconfirm email/password.
2. **Google verification.** External + ≤100 test users works for a 16-student club. If you ever scale past 100, you'll need Google to verify the app (takes a few days).
3. **Privacy / district policy review.** I'm not a lawyer. The `/privacy` page and a heads-up to the club sponsor are operational mitigations, not a legal opinion. High-school students are 13+ so COPPA likely doesn't apply, but the school's own AUP might.
4. **Subtle RLS leaks.** Even with the policies above, RLS edge cases exist when joins span tables. The two-student integration test is the safety net — if it ever stops passing, do not deploy.

## Out of scope for this spec

- Real-time dashboard updates (e.g., Supabase Realtime subscriptions) — page reload is fine for v1.
- A "current activity" view ("Sara is on Session 5 right now") — could be useful in class but not now.
- Automatic "abandoned lab" sweeper — manual is fine for 16 students.
- Bulk approve via CSV upload — single-click bulk approve covers it.
- Per-student notes / comments by the teacher — possible v2.
- Email notifications to the teacher when a student signs up — Phase 3+.
- Student-side "your progress" view — sessions page already shows what they need.
