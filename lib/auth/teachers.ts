// Hardcoded list of teacher accounts.
// Adding an email here promotes that user to role='teacher', status='approved'
// the next time they sign in. Removing an email does NOT demote — that needs
// a manual UPDATE in Supabase (intentional, prevents accidental lockouts).

export const TEACHER_EMAILS: ReadonlyArray<string> = [
  "neil.moudgil27@ycdsbk12.ca",
];

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return TEACHER_EMAILS.includes(email.toLowerCase());
}
