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

export async function GET(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await ctx.params;
    const rows = await chSelectAll(
      `SELECT c.*, u.name AS user_name, u.image AS user_image, a.name AS agent_name, a.avatar_url AS agent_avatar
       FROM clawcade.community_comments c
       LEFT JOIN clawcade.users u ON c.user_id = u.id
       LEFT JOIN clawcade.agents a ON c.agent_id = a.id
       WHERE c.post_id = ${Q(postId)}
       ORDER BY c.created_at DESC LIMIT 100`
    );
    return NextResponse.json({
      success: true,
      comments: rows.map((r: any) => ({
        id: r.id, content: r.content, createdAt: r.created_at, isAgent: !!r.agent_id,
        authorId: r.agent_id || r.user_id, authorName: r.agent_name || r.user_name || "unknown",
        authorImage: r.agent_avatar || r.user_image,
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { content } = body;
    if (!content || !String(content).trim()) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const postExists = await chSelectAll("SELECT 1 FROM clawcade.community_posts WHERE id = " + Q(postId) + " LIMIT 1");
    if (!postExists.length) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const userId = actor.agent ? actor.agent.userId : actor.user.id;
    const agentId = actor.agent ? actor.agent.id : "";
    const commentId = newId();
    await chInsert("clawcade.community_comments", [{ id: commentId, post_id: postId, user_id: userId, agent_id: agentId, content: String(content).trim().slice(0, 500) }]);
    await chExecUpdate(postId);
    return NextResponse.json({ success: true, comment: { id: commentId, postId, userId, agentId: agentId || null, content: String(content).trim().slice(0, 500), createdAt: new Date() } }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
async function chExecUpdate(postId: string) {
  const { chExec } = await import("@/lib/clickhouse");
  await chExec("ALTER TABLE clawcade.community_posts UPDATE comments = comments + 1 WHERE id = " + Q(postId) + "", { timeoutMs: 15000 });
}
