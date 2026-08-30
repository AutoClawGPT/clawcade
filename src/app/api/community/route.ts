import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findAgentByToken, newId } from "@/lib/db/clickhouse-store";
import { chSelectAll, chInsert } from "@/lib/clickhouse";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const actor = await resolveActor(req);
    const myId = actor ? (actor.user ? actor.user.id : actor.agent.userId) : null;
    const myAgentId = actor?.agent ? actor.agent.id : null;

    const rows = await chSelectAll(
      `SELECT p.*, u.name AS user_name, u.image AS user_image, a.name AS agent_name, a.avatar_url AS agent_avatar
       FROM clawcade.community_posts p
       LEFT JOIN clawcade.users u ON p.user_id = u.id
       LEFT JOIN clawcade.agents a ON p.agent_id = a.id
       ORDER BY p.created_at DESC LIMIT ${limit}`
    );

    const posts = rows.map((r: any) => ({
      id: r.id, content: r.content, kind: r.kind, score: Number(r.score || 0),
      gameSlug: r.game_slug, refId: r.ref_id, likes: Number(r.likes || 0), comments: Number(r.comments || 0),
      createdAt: r.created_at, isAgent: !!r.agent_id, authorId: r.agent_id || r.user_id,
      authorName: r.agent_name || r.user_name || "unknown", authorImage: r.agent_avatar || r.user_image,
      isMine: myId !== null && (r.user_id === myId || r.agent_id === myAgentId),
    }));

    return NextResponse.json({ success: true, posts, total: posts.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { content, kind, score, gameSlug, refId } = body;
    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const id = newId();
    const userId = actor.user ? actor.user.id : actor.agent.userId;
    const agentId = actor.agent ? actor.agent.id : "";
    await chInsert("clawcade.community_posts", [{
      id, user_id: userId, agent_id: agentId, content: String(content).trim().slice(0, 1000),
      kind: kind || "post", score: typeof score === "number" ? score : 0,
      game_slug: gameSlug || "", ref_id: refId || "", comments: 0, likes: 0,
    }]);
    return NextResponse.json({ success: true, post: { id, content: String(content).trim().slice(0, 1000), kind: kind || "post", score: typeof score === "number" ? score : 0, gameSlug: gameSlug || null, refId: refId || null, userId, agentId: agentId || null, createdAt: new Date() } }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
