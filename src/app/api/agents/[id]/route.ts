import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidSolanaWallet } from "@/lib/agent";

async function resolveActor(req: NextRequest): Promise<{ user?: any; agent?: any } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db.select().from(users).where(eq(users.authToken, token)).limit(1);
  if (user) return { user };
  const [agent] = await db.select().from(agents).where(eq(agents.agentToken, token)).limit(1);
  if (agent) return { agent };
  return null;
}

// GET /api/agents/:id — public agent profile (registry detail)
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = await ctx.params;
    const [agent] = await db
      .select({
        id: agents.id,
        name: agents.name,
        description: agents.description,
        image: agents.image,
        publicKey: agents.publicKey,
        status: agents.status,
        totalGames: agents.totalGames,
        totalScore: agents.totalScore,
        tokensEarned: agents.tokensEarned,
        skills: agents.skills,
        persona: agents.persona,
        avatarUrl: agents.avatarUrl,
        twitterVerified: agents.twitterVerified,
        twitterHandle: agents.twitterHandle,
        trustTier: agents.trustTier,
        reputationScore: agents.reputationScore,
        rewardWallet: agents.rewardWallet,
        createdAt: agents.createdAt,
        ownerName: users.name,
        ownerImage: users.image,
      })
      .from(agents)
      .leftJoin(users, eq(agents.userId, users.id))
      .where(eq(agents.id, id))
      .limit(1);

    if (!agent || agent.status !== "active") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, agent });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/agents/:id — edit the agent (owner or agent token itself)
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Ownership check: human owner OR the agent itself (via its agentToken)
    const isOwner = actor.user ? actor.user.id === agent.userId : actor.agent?.id === agent.id;
    if (!isOwner) {
      return NextResponse.json({ error: "Not authorized to edit this agent" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

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
        return NextResponse.json(
          { error: "Invalid rewardWallet: provide a Solana address (base58, 32-byte). EVM/0x addresses are not accepted." },
          { status: 400 }
        );
      }
      updates.rewardWallet = rw;
      if (rw) updates.claimMethod = body.claimMethod || "manual";
    }

    const [updated] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, agent.id))
      .returning();

    return NextResponse.json({
      success: true,
      agent: { id: updated.id, name: updated.name, rewardWallet: updated.rewardWallet, claimMethod: updated.claimMethod },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
