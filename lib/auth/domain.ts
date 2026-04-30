const STUDENT_DOMAIN = "@ycdsbk12.ca";

export function isYcdsbEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(STUDENT_DOMAIN);
}
