// Loads a session's notes.mdx from disk. Server-only.
import fs from "node:fs/promises";
import path from "node:path";

export async function loadSessionNotes(slug: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), "content", "sessions", slug, "notes.mdx");
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
