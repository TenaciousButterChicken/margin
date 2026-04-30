// YCDSB email format is firstname.lastname{year}@ycdsbk12.ca.
// For non-YCDSB or unparseable emails, fall back to first letter of email.
//
// Examples:
//   neil.moudgil27@ycdsbk12.ca   -> "NM"
//   ryan.lai27@ycdsbk12.ca       -> "RL"
//   foo@gmail.com                -> "F"
//   bar.baz@gmail.com            -> "BB"
export function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local) return "?";
  // Strip trailing digits (the YCDSB graduation year). "moudgil27" -> "moudgil".
  const cleaned = local.replace(/\d+$/, "");
  const segments = cleaned.split(".").filter(Boolean);
  if (segments.length === 0) return "?";
  if (segments.length === 1) return segments[0]!.charAt(0).toUpperCase();
  return (segments[0]!.charAt(0) + segments[1]!.charAt(0)).toUpperCase();
}

// Title-cased display name from the email local-part, with the trailing
// year stripped. "neil.moudgil27" -> "Neil Moudgil".
export function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const cleaned = local.replace(/\d+$/, "");
  const segments = cleaned.split(".").filter(Boolean);
  if (segments.length === 0) return "";
  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
