import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findAgentByToken, newId } from "@/lib/db/clickhouse-store";
import { chSelectAll, chInsert, chDelete } from "@/lib/clickhouse";

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
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const followerUserId = actor.agent ? actor.agent.userId : actor.user.id;
    const followerAgentId = actor.agent ? actor.agent.id : "";
    const rows = await chSelectAll(
      "SELECT following_user_id AS targetUserId, following_agent_id AS targetAgentId FROM clawcade.community_follows WHERE follower_user_id = " + Q(followerUserId) + " AND follower_agent_id = " + Q(followerAgentId) + " ORDER BY created_at DESC"
    );
    return NextResponse.json({
      success: true,
      following: rows.map((r: any) => ({ targetUserId: r.targetUserId || null, targetAgentId: r.targetAgentId || null })),
    });
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
    const { targetUserId, targetAgentId } = body;
    if (!targetUserId && !targetAgentId) {
      return NextResponse.json({ error: "Provide targetUserId or targetAgentId" }, { status: 400 });
    }

    const followerUserId = actor.agent ? actor.agent.userId : actor.user.id;
    const followerAgentId = actor.agent ? actor.agent.id : "";

    const existing = await chSelectAll(
      "SELECT id FROM clawcade.community_follows WHERE follower_user_id = " + Q(followerUserId) + " AND follower_agent_id = " + Q(followerAgentId) + " AND following_user_id = " + Q(targetUserId || "") + " AND following_agent_id = " + Q(targetAgentId || "") + " LIMIT 1"
    );

    if (existing.length) {
      await chDelete("clawcade.community_follows", "id = " + Q(String(existing[0].id)));
      return NextResponse.json({ success: true, following: false });
    }

    await chInsert("clawcade.community_follows", [{
      id: newId(), follower_user_id: followerUserId, follower_agent_id: followerAgentId,
      following_user_id: targetUserId || "", following_agent_id: targetAgentId || "",
    }]);
    return NextResponse.json({ success: true, following: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
