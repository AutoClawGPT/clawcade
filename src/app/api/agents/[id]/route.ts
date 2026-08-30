import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findAgentByToken, findAgentById, updateAgentRows } from "@/lib/db/clickhouse-store";
import { chSelectFirst } from "@/lib/clickhouse";
import { isValidSolanaWallet } from "@/lib/agent";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

async function resolveActor(req: NextRequest): Promise<{ user?: any; agent?: any } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const user = await findUserByAuthToken(token);
  if (user) return { user };
  const agent = await findAgentByToken(token);
  if (agent) return { agent };
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await chSelectFirst(
      `SELECT a.*, u.name AS owner_name, u.image AS owner_image
       FROM clawcade.agents a LEFT JOIN clawcade.users u ON a.user_id = u.id
       WHERE a.id = ${Q(id)} LIMIT 1`
    );
    if (!row || row.status !== "active") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      agent: {
        id: row.id, name: row.name, description: row.description, image: row.image, publicKey: row.public_key,
        status: row.status, totalGames: Number(row.total_games || 0), totalScore: Number(row.total_score || 0),
        tokensEarned: 0, skills: row.skills ? JSON.parse(String(row.skills)) : [], persona: row.persona,
        avatarUrl: row.avatar_url, twitterVerified: false, twitterHandle: row.twitter_handle || "",
        trustTier: "", reputationScore: 0, rewardWallet: row.reward_wallet, createdAt: row.created_at,
        ownerName: row.owner_name, ownerImage: row.owner_image,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = await findAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const isOwner = actor.user ? actor.user.id === agent.userId : actor.agent?.id === agent.id;
    if (!isOwner) return NextResponse.json({ error: "Not authorized to edit this agent" }, { status: 403 });

    const body = await req.json();
    const updates: Record<string, any> = {};
    if (body.name !== undefined && body.name !== "") updates.name = String(body.name).trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.image !== undefined) updates.image = body.image;
    if (body.skills !== undefined && Array.isArray(body.skills)) updates.skills = body.skills;
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
    if (body.twitterHandle !== undefined) updates.twitterHandle = body.twitterHandle;
    if (body.persona !== undefined) updates.persona = body.persona;

    if (body.rewardWallet !== undefined) {
      const rw = body.rewardWallet ? String(body.rewardWallet).trim() : null;
      if (rw && !isValidSolanaWallet(rw)) {
        return NextResponse.json({ error: "Invalid rewardWallet: provide a Solana address (base58, 32-byte). EVM/0x addresses are not accepted." }, { status: 400 });
      }
      updates.rewardWallet = rw;
      if (rw) updates.claimMethod = body.claimMethod || "manual";
    }

    const updated = await updateAgentRows(id, updates);
    return NextResponse.json({ success: true, agent: { id: updated.id, name: updated.name, rewardWallet: updated.rewardWallet, claimMethod: updated.claimMethod } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
