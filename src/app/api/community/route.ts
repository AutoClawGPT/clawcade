import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { communityPosts, communityLikes, users, agents } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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

function actorName(actor: { user?: any; agent?: any }): { name: string; userId: string | null; agentId: string | null } {
  if (actor.agent) return { name: actor.agent.name, userId: actor.agent.userId, agentId: actor.agent.id };
  return { name: actor.user?.name || "player", userId: actor.user?.id || null, agentId: null };
}

// GET /api/community — feed of posts (users + agents)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const mine = searchParams.get("mine") === "true";

    const authHeader = req.headers.get("authorization");
    let myId: string | null = null;
    let myAgentId: string | null = null;
    const actor = await resolveActor(req);
    if (actor) {
      myId = actor.user ? actor.user.id : actor.agent.userId;
      myAgentId = actor.agent ? actor.agent.id : null;
    }

    const rows = await db
      .select({
        id: communityPosts.id,
        content: communityPosts.content,
        kind: communityPosts.kind,
        score: communityPosts.score,
        gameSlug: communityPosts.gameSlug,
        refId: communityPosts.refId,
        likes: communityPosts.likes,
        comments: communityPosts.comments,
        createdAt: communityPosts.createdAt,
        userId: communityPosts.userId,
        agentId: communityPosts.agentId,
        userName: users.name,
        userImage: users.image,
        agentName: agents.name,
        agentAvatar: agents.avatarUrl,
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.userId, users.id))
      .leftJoin(agents, eq(communityPosts.agentId, agents.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit);

    const posts = rows.map((r) => {
      const authorName = r.agentName || r.userName || "unknown";
      const authorImage = r.agentAvatar || r.userImage;
      const isMine = myId !== null && (r.userId === myId || r.agentId === myAgentId);
      return {
        id: r.id,
        content: r.content,
        kind: r.kind,
        score: r.score,
        gameSlug: r.gameSlug,
        refId: r.refId,
        likes: r.likes,
        comments: r.comments,
        createdAt: r.createdAt,
        isAgent: !!r.agentId,
        authorId: r.agentId || r.userId,
        authorName,
        authorImage,
        isMine,
      };
    });

    return NextResponse.json({ success: true, posts, total: posts.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/community — create a post (human or agent)
export async function POST(req: NextRequest) {
  try {
    const actor = await resolveActor(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { content, kind, score, gameSlug, refId } = body;
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const who = actorName(actor);
    const [post] = await db
      .insert(communityPosts)
      .values({
        id: uuid(),
        userId: who.userId,
        agentId: who.agentId,
        content: String(content).trim().slice(0, 1000),
        kind: kind || "post",
        score: typeof score === "number" ? score : null,
        gameSlug: gameSlug || null,
        refId: refId || null,
        createdAt: new Date(),
      })
      .returning();
    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
