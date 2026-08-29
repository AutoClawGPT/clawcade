import { NextRequest, NextResponse } from "next/server";
import { createAgent, listSkills } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// POST /api/clawpump/create-agent — create a real ClawPump agent from Settings
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in first." }, { status: 401 });
    }
    const key = getClawpumpKey(user);
    if (!key) {
      return NextResponse.json(
        {
          error:
            "Connect your own ClawPump API key in Settings first, then create agents.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, persona, model, skills } = body;
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    // Validate skills against the catalog if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      try {
        const catalog = await listSkills(key);
        const validSlugs = new Set((catalog || []).map((s) => s.slug));
        const bad = skills.filter((s: string) => !validSlugs.has(s));
        if (bad.length > 0) {
          return NextResponse.json(
            { error: `Unknown skill(s): ${bad.join(", ")}` },
            { status: 400 }
          );
        }
      } catch {
        // catalog fetch failed — let upstream decide
      }
    }

    const agent = await createAgent(
      {
        name: name.trim(),
        persona: persona || undefined,
        model: model || undefined,
        skills: skills || undefined,
      },
      key
    );

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump create-agent error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
