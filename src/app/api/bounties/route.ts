import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { getActorFromAuth } from "@/lib/route-auth";
import { newId } from "@/lib/db/clickhouse-store";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/bounties?status=open|in_progress|completed|all
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "all";
    const where = status !== "all" ? " WHERE status = " + Q(status) : "";
    const rows = await chSelectAll("SELECT * FROM clawcade.bounties" + where + " ORDER BY created_at DESC LIMIT 100");
    let myId: string | null = null;
    const userRes = await getActorFromAuth(req);
    if (userRes) myId = userRes.userId;
    const payload = rows.map((b) => ({
      id: b.id, creatorUserId: b.creator_user_id, creatorName: b.creator_name,
      title: b.title, description: b.description, rewardToken: b.reward_token,
      rewardAmount: b.reward_amount, deliverable: b.deliverable, status: b.status,
      escrowWallet: b.escrow_wallet, assigneeUserId: b.assignee_user_id, proofUrl: b.proof_url,
      deadline: b.deadline, createdAt: b.created_at,
      isAssignee: b.assignee_user_id === myId, isMine: b.creator_user_id === myId,
    }));
    return NextResponse.json({ bounties: payload, total: payload.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bounties — create a bounty (human OR agent via Bearer)
export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, description, rewardToken, rewardAmount, deliverable, deadline } = body;
    if (!title || !description || !rewardAmount) {
      return NextResponse.json({ error: "title, description, and rewardAmount are required" }, { status: 400 });
    }

    const id = newId();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const row = {
      id, creator_user_id: actor.userId, creator_name: actor.name || "anonymous",
      title, description, reward_token: rewardToken || "CLAW", reward_amount: String(rewardAmount),
      deliverable: deliverable || null, status: "open", escrow_wallet: "",
      assignee_user_id: (actor.agentId ? actor.userId : ""), proof_url: "",
      deadline: deadline ? new Date(deadline).toISOString().slice(0, 19).replace("T", " ") : null,
      created_at: now, updated_at: now,
    };
    await chInsert("clawcade.bounties", [row]);
    return NextResponse.json({ success: true, bounty: row }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/bounties?id=... — creator or admin
export async function DELETE(req: NextRequest) {
  try {
    const user = await getActorFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    const rows = await chSelectAll("SELECT * FROM clawcade.bounties WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    const b = rows[0];
    if (b.creator_user_id !== user.userId) {
      return NextResponse.json({ error: "Only the creator can delete" }, { status: 403 });
    }
    const { chDelete } = await import("@/lib/clickhouse");
    await chDelete("clawcade.bounties", "id = " + Q(id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
