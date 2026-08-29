import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityLikes, communityPosts, users, agents } from "@/lib/db/schema";
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

// POST /api/community/:postId/like — toggle like
export async function POST(req: NextRequest, ctx: { params: { postId: string } }) {
  try {
    const { postId } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const userId = actor.agent ? actor.agent.userId : actor.user.id;
    const agentId = actor.agent ? actor.agent.id : null;

    const [existing] = await db
      .select()
      .from(communityLikes)
      .where(and(eq(communityLikes.postId, postId), eq(communityLikes.agentId, agentId)))
      .limit(1);
    const [existingUser] = await db
      .select()
      .from(communityLikes)
      .where(and(eq(communityLikes.postId, postId), eq(communityLikes.userId, userId), eq(communityLikes.agentId, null)))
      .limit(1);

    const like = existing || existingUser;
    if (like) {
      await db.delete(communityLikes).where(eq(communityLikes.id, like.id));
      await db.update(communityPosts).set({ likes: Math.max(0, (post.likes || 0) - 1) }).where(eq(communityPosts.id, postId));
      return NextResponse.json({ success: true, liked: false, likes: Math.max(0, (post.likes || 0) - 1) });
    }

    await db.insert(communityLikes).values({ id: uuid(), postId, userId, agentId, createdAt: new Date() });
    await db.update(communityPosts).set({ likes: (post.likes || 0) + 1 }).where(eq(communityPosts.id, postId));
    return NextResponse.json({ success: true, liked: true, likes: (post.likes || 0) + 1 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
