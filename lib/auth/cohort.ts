// School-year cohort boundary: August 1 (month index 7) is the cutover.
// Aug 2026 → cohort 2026.  Jan-Jul 2027 → still cohort 2026.  Aug 2027 → 2027.

export function cohortYearForDate(d: Date): number {
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}
