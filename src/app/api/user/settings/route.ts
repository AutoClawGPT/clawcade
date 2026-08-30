import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, updateUser } from "@/lib/db/clickhouse-store";
import { encryptKey, decryptKey } from "@/lib/crypto";
import { listAgents, listSkills } from "@/lib/clawpump";

interface ClawPumpSkillLite { slug: string; name: string; description: string; alwaysOn: boolean; }
interface ClawPumpAgentLite { id: string; name: string; status: string; walletAddress: string; model: string; persona: string; skills: string[]; }

async function fetchClawpumpSkills(key: string): Promise<ClawPumpSkillLite[] | null> {
  try {
    const skills = await listSkills(key);
    return skills.map((s) => ({ slug: s.slug, name: s.name, description: s.description, alwaysOn: s.alwaysOn }));
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await findUserByAuthToken(authHeader.slice(7));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const encryptedKeys = user.encryptedKeys || {};
    const hasClawpumpKey = !!encryptedKeys.clawpumpApiKey;
    let clawpumpProfile: { agents: ClawPumpAgentLite[]; skills?: ClawPumpSkillLite[] | null } | null = null;
    if (hasClawpumpKey) {
      try {
        const key = decryptKey(encryptedKeys.clawpumpApiKey);
        const [agents, skills] = await Promise.all([listAgents(key, { fresh: true }), fetchClawpumpSkills(key)]);
        clawpumpProfile = { agents: agents.map((a) => ({ id: a.id, name: a.name, status: a.status, walletAddress: a.walletAddress, model: a.model, persona: a.persona, skills: a.skills })), skills };
      } catch {
        clawpumpProfile = null;
      }
    }

    const connectedKeys = Object.keys(encryptedKeys).filter((k) => k && k !== "" && k !== "clawpumpProfile");
    return NextResponse.json({
      settings: { name: user.name, email: user.email, image: user.image, walletAddress: user.walletAddress, rewardWallet: user.rewardWallet, claimMethod: user.claimMethod, twitterHandle: user.twitterHandle },
      hasClawpumpKey,
      clawpump: clawpumpProfile,
      connectedKeys: connectedKeys.map((name) => ({ name, connected: true, masked: "••••••••" })),
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await findUserByAuthToken(authHeader.slice(7));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, image, walletAddress, rewardWallet, claimMethod, twitterHandle, clawpumpApiKey, disconnectClawpump, settings } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined && name !== "") updates.name = name;
    if (image !== undefined) updates.image = image;
    if (settings?.name) updates.name = settings.name;
    if (settings?.image !== undefined) updates.image = settings.image;
    if (walletAddress !== undefined) updates.walletAddress = walletAddress;
    if (settings?.walletAddress !== undefined) updates.walletAddress = settings.walletAddress;
    if (rewardWallet !== undefined) updates.rewardWallet = rewardWallet;
    if (settings?.rewardWallet !== undefined) updates.rewardWallet = settings.rewardWallet;
    if (claimMethod !== undefined) updates.claimMethod = claimMethod;
    if (settings?.claimMethod !== undefined) updates.claimMethod = settings.claimMethod;
    if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle;
    if (settings?.twitterHandle !== undefined) updates.twitterHandle = settings.twitterHandle;

    const currentKeys = user.encryptedKeys || {};
    const newKeys = { ...currentKeys };

    if (disconnectClawpump === true) {
      delete newKeys.clawpumpApiKey;
      delete newKeys.clawpumpProfile;
    }

    let clawpumpProfile: { agents: ClawPumpAgentLite[]; skills?: ClawPumpSkillLite[] | null } | null = null;
    if (clawpumpApiKey !== undefined && clawpumpApiKey !== "") {
      if (!clawpumpApiKey.startsWith("cpk_")) {
        return NextResponse.json({ error: "ClawPump API key must start with cpk_" }, { status: 400 });
      }
      try {
        const [agents, skills] = await Promise.all([listAgents(clawpumpApiKey, { fresh: true }), fetchClawpumpSkills(clawpumpApiKey)]);
        clawpumpProfile = { agents: agents.map((a) => ({ id: a.id, name: a.name, status: a.status, walletAddress: a.walletAddress, model: a.model, persona: a.persona, skills: a.skills })), skills };
      } catch (verifyErr) {
        return NextResponse.json({ error: "Invalid ClawPump API key — could not connect to clawpump.tech. Check the key and try again.", detail: verifyErr instanceof Error ? verifyErr.message : String(verifyErr) }, { status: 400 });
      }
      newKeys.clawpumpApiKey = encryptKey(clawpumpApiKey);
      if (clawpumpProfile) newKeys.clawpumpProfile = encryptKey(JSON.stringify(clawpumpProfile));
    }

    updates.encryptedKeys = newKeys;
    await updateUser(user.id, updates);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      hasClawpumpKey: !!newKeys.clawpumpApiKey,
      clawpump: clawpumpProfile,
      connectedKeys: Object.keys(newKeys).filter((k) => k && k !== "" && k !== "clawpumpProfile"),
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
