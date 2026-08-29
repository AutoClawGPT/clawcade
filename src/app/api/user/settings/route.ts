import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptKey, decryptKey } from "@/lib/crypto";
import { listAgents, listSkills } from "@/lib/clawpump";

async function getUserFromAuth(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authToken, token))
    .limit(1);
  return user || null;
}

// GET /api/user/settings — profile + connected keys + live ClawPump profile
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const encryptedKeys = (user.encryptedKeys as Record<string, string>) || {};
    const hasClawpumpKey = !!encryptedKeys.clawpumpApiKey;

    let clawpumpProfile: { agents: ClawPumpAgentLite[]; skills?: ClawPumpSkillLite[] | null } | null = null;
    if (hasClawpumpKey) {
      try {
        const key = decryptKey(encryptedKeys.clawpumpApiKey);
        const [agents, skills] = await Promise.all([
          listAgents(key, { fresh: true }),
          fetchClawpumpSkills(key),
        ]);
        clawpumpProfile = {
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            walletAddress: a.walletAddress,
            model: a.model,
            persona: a.persona,
            skills: a.skills,
          })),
          skills,
        };
      } catch {
        clawpumpProfile = null;
      }
    }

    const connectedKeys = Object.keys(encryptedKeys).filter(
      (k) => k && k !== "" && k !== "clawpumpProfile"
    );

    return NextResponse.json({
      settings: {
        name: user.name,
        email: user.email,
        image: user.image,
        walletAddress: user.walletAddress,
      },
      hasClawpumpKey,
      clawpump: clawpumpProfile,
      connectedKeys: connectedKeys.map((name) => ({
        name,
        connected: true,
        masked: "••••••••",
      })),
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}


interface ClawPumpSkillLite {
  slug: string;
  name: string;
  description: string;
  alwaysOn: boolean;
}

async function fetchClawpumpSkills(key: string): Promise<ClawPumpSkillLite[] | null> {
  try {
    const skills = await listSkills(key);
    return skills.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      alwaysOn: s.alwaysOn,
    }));
  } catch {
    return null;
  }
}

interface ClawPumpAgentLite {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  model: string;
  persona: string;
  skills: string[];
}

// PUT /api/user/settings — update settings, connect API keys (verified live)
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, image, walletAddress, clawpumpApiKey, disconnectClawpump, settings } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined && name !== "") updates.name = name;
    if (image !== undefined) updates.image = image;
    if (walletAddress !== undefined) updates.walletAddress = walletAddress;

    const currentKeys = (user.encryptedKeys as Record<string, string>) || {};
    const newKeys = { ...currentKeys };

    // Disconnect ClawPump key (remove encrypted key + cached profile)
    if (disconnectClawpump === true) {
      delete newKeys.clawpumpApiKey;
      delete newKeys.clawpumpProfile;
    }

    // Connect ClawPump key — VERIFY live before saving
    let clawpumpProfile: { agents: ClawPumpAgentLite[]; skills?: ClawPumpSkillLite[] | null } | null = null;
    if (clawpumpApiKey !== undefined && clawpumpApiKey !== "") {
      if (!clawpumpApiKey.startsWith("cpk_")) {
        return NextResponse.json(
          { error: "ClawPump API key must start with cpk_" },
          { status: 400 }
        );
      }
      try {
        const [agents, skills] = await Promise.all([
          listAgents(clawpumpApiKey, { fresh: true }),
          fetchClawpumpSkills(clawpumpApiKey),
        ]);
        clawpumpProfile = {
          agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            walletAddress: a.walletAddress,
            model: a.model,
            persona: a.persona,
            skills: a.skills,
          })),
          skills,
        };
      } catch (verifyErr) {
        return NextResponse.json(
          {
            error:
              "Invalid ClawPump API key — could not connect to clawpump.tech. Check the key and try again.",
            detail: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
          },
          { status: 400 }
        );
      }
      newKeys.clawpumpApiKey = encryptKey(clawpumpApiKey);
      if (clawpumpProfile) {
        newKeys.clawpumpProfile = encryptKey(JSON.stringify(clawpumpProfile));
      }
    }

    updates.encryptedKeys = newKeys;

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      hasClawpumpKey: !!newKeys.clawpumpApiKey,
      clawpump: clawpumpProfile,
      connectedKeys: Object.keys(newKeys).filter(
        (k) => k && k !== "" && k !== "clawpumpProfile"
      ),
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
