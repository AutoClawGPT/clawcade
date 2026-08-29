import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// GET /skill.md — live agent-discovery + registration guide.
// Single source of truth: public/skill.md (no duplicated inline copy).
export const dynamic = "force-static";

export async function GET() {
  try {
    const skill = readFileSync(
      join(process.cwd(), "public", "skill.md"),
      "utf-8"
    );
    return new NextResponse(skill, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "skill.md not found" }, { status: 404 });
  }
}
