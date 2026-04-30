-- Expands the profiles.role text CHECK from ('student','teacher') to the
-- full club-position set. Migrates the only 'teacher' user (Ryan) to
-- 'co-founder' and promotes Neil from 'teacher' to 'founder'. Updates
-- is_teacher() to mean "any non-student role" so RLS policies keep
-- working without renaming the function across the codebase.

-- 1. Replace the CHECK constraint.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'student',
    'founder',
    'co-founder',
    'president',
    'vice-president',
    'secretary',
    'treasurer',
    'teacher-sponsor'
  ));

-- 2. Migrate the two seeded accounts. The hardcoded role-seeds map in
--    lib/auth/role-seeds.ts re-asserts these on every sign-in, so
--    these UPDATEs are belt-and-suspenders against the first sign-in
--    after deploy.
UPDATE profiles SET role = 'co-founder'
WHERE email = 'ryan.lai27@ycdsbk12.ca';

UPDATE profiles SET role = 'founder'
WHERE email = 'neil.moudgil27@ycdsbk12.ca';

-- 3. Redefine is_teacher() as "any non-student role". The function name
--    is kept (legacy) so existing RLS policies on session_heartbeats,
--    session_completions, lab_attempts, hint_usage, and profiles continue
--    to gate on it without policy churn.
CREATE OR REPLACE FUNCTION is_teacher() RETURNS bool
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(role <> 'student', false) FROM profiles WHERE id = auth.uid()
$$;
