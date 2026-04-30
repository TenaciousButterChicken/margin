import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/teacher/guard";
import { getRoster } from "@/lib/teacher/queries";

// CSV export of the roster. Server-streamed text; teacher-only.

export async function GET() {
  await requireTeacher();
  const rows = await getRoster();

  const header = [
    "email",
    "full_name",
    "role",
    "status",
    "cohort_year",
    "sessions_completed",
    "total_minutes",
    "last_seen",
    "created_at",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.full_name ?? ""),
        r.role,
        r.status,
        String(r.cohort_year),
        String(r.sessions_completed),
        String(r.total_minutes),
        r.last_seen ?? "",
        r.created_at,
      ].join(",")
    );
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="margin-roster-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
