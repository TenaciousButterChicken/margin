-- Phase 1 + Phase 2 schema for Margin auth + tracking.
-- Run in Supabase SQL Editor. Idempotent: safe to re-run during dev.

-- ===========================================================================
-- TABLES
-- ===========================================================================

-- profiles ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
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

-- session_heartbeats --------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_heartbeats (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  lab_id     text,
  bucket_ts  timestamptz NOT NULL,
  PRIMARY KEY (user_id, session_id, bucket_ts)
);
CREATE INDEX IF NOT EXISTS session_heartbeats_user_session_idx
  ON session_heartbeats (user_id, session_id);

-- session_completions -------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_completions (
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id   text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, session_id)
);

-- lab_attempts --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  lab_id      text NOT NULL,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  outcome     text NOT NULL DEFAULT 'in_progress'
              CHECK (outcome IN ('in_progress','completed','abandoned')),
  final_state jsonb CHECK (final_state IS NULL OR octet_length(final_state::text) <= 16384)
);
CREATE INDEX IF NOT EXISTS lab_attempts_user_lab_idx ON lab_attempts (user_id, lab_id);

-- hint_usage ----------------------------------------------------------------
-- Note: spec originally had a generated `month_bucket` column for O(1) quota
-- checks, but Postgres requires generated-column expressions to be IMMUTABLE,
-- and to_char() / date_trunc() on timestamptz don't qualify (timezone dep).
-- Quota queries compute the month bucket on read instead — cheap at our scale.
CREATE TABLE IF NOT EXISTS hint_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id   text,
  lab_id       text,
  widget_id    text,
  hint_type    text NOT NULL CHECK (hint_type IN ('hardcoded','ai')),
  prompt       text,
  response     text,
  requested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hint_usage_user_requested_idx
  ON hint_usage (user_id, requested_at);

-- session_progress (view) ---------------------------------------------------
CREATE OR REPLACE VIEW session_progress AS
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

-- ===========================================================================
-- HELPER FUNCTIONS (security definer to avoid RLS recursion)
-- ===========================================================================

CREATE OR REPLACE FUNCTION is_teacher() RETURNS bool
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(role = 'teacher', false) FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION is_approved() RETURNS bool
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(status = 'approved', false) FROM profiles WHERE id = auth.uid()
$$;

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_heartbeats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hint_usage          ENABLE ROW LEVEL SECURITY;

-- profiles policies ---------------------------------------------------------
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (id = auth.uid() OR is_teacher());

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (is_teacher());

-- INSERT into profiles is done via the service-role key only (server actions).
-- Authenticated clients are not granted INSERT on profiles.

-- Column grants: only teachers may UPDATE, and only these four columns.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT  UPDATE (status, role, approved_at, approved_by) ON profiles TO authenticated;

-- session_heartbeats --------------------------------------------------------
DROP POLICY IF EXISTS heartbeats_select ON session_heartbeats;
CREATE POLICY heartbeats_select ON session_heartbeats FOR SELECT
  USING (user_id = auth.uid() OR is_teacher());

DROP POLICY IF EXISTS heartbeats_insert ON session_heartbeats;
CREATE POLICY heartbeats_insert ON session_heartbeats FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved());

-- session_completions -------------------------------------------------------
DROP POLICY IF EXISTS completions_select ON session_completions;
CREATE POLICY completions_select ON session_completions FOR SELECT
  USING (user_id = auth.uid() OR is_teacher());

DROP POLICY IF EXISTS completions_insert ON session_completions;
CREATE POLICY completions_insert ON session_completions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved());

-- lab_attempts --------------------------------------------------------------
DROP POLICY IF EXISTS lab_attempts_select ON lab_attempts;
CREATE POLICY lab_attempts_select ON lab_attempts FOR SELECT
  USING (user_id = auth.uid() OR is_teacher());

DROP POLICY IF EXISTS lab_attempts_insert ON lab_attempts;
CREATE POLICY lab_attempts_insert ON lab_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved());

DROP POLICY IF EXISTS lab_attempts_update ON lab_attempts;
CREATE POLICY lab_attempts_update ON lab_attempts FOR UPDATE
  USING (user_id = auth.uid() AND is_approved());

-- hint_usage ----------------------------------------------------------------
DROP POLICY IF EXISTS hint_usage_select ON hint_usage;
CREATE POLICY hint_usage_select ON hint_usage FOR SELECT
  USING (user_id = auth.uid() OR is_teacher());

DROP POLICY IF EXISTS hint_usage_insert ON hint_usage;
CREATE POLICY hint_usage_insert ON hint_usage FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved());

-- ===========================================================================
-- DONE
-- ===========================================================================
