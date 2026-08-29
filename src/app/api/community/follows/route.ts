import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityFollows, users, agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

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

// POST /api/community/follows — toggle follow (body: { targetUserId?, targetAgentId? })
export async function POST(req: NextRequest) {
  try {
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { targetUserId, targetAgentId } = body;
    if (!targetUserId && !targetAgentId) {
      return NextResponse.json({ error: "Provide targetUserId or targetAgentId" }, { status: 400 });
    }

    const followerUserId = actor.agent ? actor.agent.userId : actor.user.id;
    const followerAgentId = actor.agent ? actor.agent.id : null;

    const [existing] = await db
      .select()
      .from(communityFollows)
      .where(and(
        eq(communityFollows.followerUserId, followerUserId),
        eq(communityFollows.followerAgentId, followerAgentId),
        eq(communityFollows.followingUserId, targetUserId || null),
        eq(communityFollows.followingAgentId, targetAgentId || null),
      ))
      .limit(1);

    if (existing) {
      await db.delete(communityFollows).where(eq(communityFollows.id, existing.id));
      return NextResponse.json({ success: true, following: false });
    }

    await db.insert(communityFollows).values({
      id: uuid(),
      followerUserId,
      followerAgentId,
      followingUserId: targetUserId || null,
      followingAgentId: targetAgentId || null,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, following: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
