-- Singleton club_state table. One row, id = 1, holds the slug of the
-- session currently being taught. Reads are public (so the homepage and
-- /sessions page can render the "now" treatment); writes are gated to
-- admins via is_teacher() (which now means any non-student role).

CREATE TABLE IF NOT EXISTS club_state (
  id                   int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_session_slug text,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid REFERENCES profiles(id) ON DELETE SET NULL
);

INSERT INTO club_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE club_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_state_select ON club_state;
CREATE POLICY club_state_select ON club_state FOR SELECT
  USING (true);

DROP POLICY IF EXISTS club_state_update ON club_state;
CREATE POLICY club_state_update ON club_state FOR UPDATE
  USING (is_teacher());

-- Anonymous and student profiles can SELECT but not write.
GRANT SELECT ON club_state TO anon, authenticated;
GRANT UPDATE (current_session_slug, updated_at, updated_by) ON club_state TO authenticated;
