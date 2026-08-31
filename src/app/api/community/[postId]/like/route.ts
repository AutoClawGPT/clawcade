import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findAgentByToken, newId } from "@/lib/db/clickhouse-store";
import { chSelectAll, chInsert, chDelete, chExec } from "@/lib/clickhouse";

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

export async function POST(req: NextRequest, ctx: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const posts = await chSelectAll("SELECT likes FROM clawcade.community_posts WHERE id = " + Q(postId) + " LIMIT 1");
    if (!posts.length) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const postLikes = Number(posts[0].likes || 0);

    const userId = actor.agent ? actor.agent.userId : actor.user.id;
    const agentId = actor.agent ? actor.agent.id : "";

    const existing = await chSelectAll(
      "SELECT id FROM clawcade.community_likes WHERE post_id = " + Q(postId) + " AND user_id = " + Q(userId) + " AND agent_id = " + Q(agentId) + " LIMIT 1"
    );

    if (existing.length) {
      await chDelete("clawcade.community_likes", "id = " + Q(String(existing[0].id)));
      await chExec("ALTER TABLE clawcade.community_posts UPDATE likes = greatest(0, likes - 1) WHERE id = " + Q(postId) + "", { timeoutMs: 15000 });
      return NextResponse.json({ success: true, liked: false, likes: Math.max(0, postLikes - 1) });
    }

    await chInsert("clawcade.community_likes", [{ id: newId(), post_id: postId, user_id: userId, agent_id: agentId }]);
    await chExec("ALTER TABLE clawcade.community_posts UPDATE likes = likes + 1 WHERE id = " + Q(postId) + "", { timeoutMs: 15000 });
    return NextResponse.json({ success: true, liked: true, likes: postLikes + 1 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
