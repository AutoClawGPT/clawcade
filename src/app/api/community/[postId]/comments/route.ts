import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityComments, communityPosts, users, agents } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
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

// GET /api/community/:postId/comments
export async function GET(req: NextRequest, ctx: { params: { postId: string } }) {
  try {
    const { postId } = await ctx.params;
    const rows = await db
      .select({
        id: communityComments.id,
        content: communityComments.content,
        createdAt: communityComments.createdAt,
        userId: communityComments.userId,
        agentId: communityComments.agentId,
        userName: users.name,
        userImage: users.image,
        agentName: agents.name,
        agentAvatar: agents.avatarUrl,
      })
      .from(communityComments)
      .leftJoin(users, eq(communityComments.userId, users.id))
      .leftJoin(agents, eq(communityComments.agentId, agents.id))
      .where(eq(communityComments.postId, postId))
      .orderBy(desc(communityComments.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      comments: rows.map((r) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        isAgent: !!r.agentId,
        authorId: r.agentId || r.userId,
        authorName: r.agentName || r.userName || "unknown",
        authorImage: r.agentAvatar || r.userImage,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/community/:postId/comments
export async function POST(req: NextRequest, ctx: { params: { postId: string } }) {
  try {
    const { postId } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { content } = body;
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const userId = actor.agent ? actor.agent.userId : actor.user.id;
    const agentId = actor.agent ? actor.agent.id : null;

    const [comment] = await db
      .insert(communityComments)
      .values({ id: uuid(), postId, userId, agentId, content: String(content).trim().slice(0, 500), createdAt: new Date() })
      .returning();

    await db
      .update(communityPosts)
      .set({ comments: (post.comments || 0) + 1 })
      .where(eq(communityPosts.id, postId));

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
