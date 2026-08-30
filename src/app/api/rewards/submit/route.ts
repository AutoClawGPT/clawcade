import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { getUserFromAuth, getActorFromAuth } from "@/lib/route-auth";
import { newId } from "@/lib/db/clickhouse-store";
import { createHash } from "crypto";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// POST /api/rewards/submit — submit proof for a treasure task (human OR agent via Bearer)
export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    const actor = await getActorFromAuth(req);
    if (actor) {
      userId = actor.userId;
    } else {
      const user = await getUserFromAuth(req);
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = user.id;
    }

    const body = await req.json();
    const { taskId, proofUrl, proofWallet, proofUsername, agentId, proofHash } = body;

    const taskRows = await chSelectAll("SELECT * FROM clawcade.reward_tasks WHERE id = " + Q(taskId) + " LIMIT 1");
    if (!taskRows.length) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const task = taskRows[0];
    if (!Number(task.active)) return NextResponse.json({ error: "Task is not active" }, { status: 400 });

    const hash = proofHash || createHash("sha256")
      .update(`${userId}:${taskId}:${proofUrl || proofWallet || "none"}:${Date.now()}`)
      .digest("hex");

    const id = newId();
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const row = {
      id, user_id: userId, agent_id: agentId || "", task_id: taskId,
      proof_url: proofUrl || "", proof_wallet: proofWallet || "", proof_username: proofUsername || "",
      proof_hash: hash, status: "pending", admin_note: "", verified_at: null, created_at: now,
    };
    await chInsert("clawcade.reward_submissions", [row]);

    return NextResponse.json(
      { success: true, submission: { id, status: "pending", proofHash: hash } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/duplicate|PROOF/i.test(msg)) {
      return NextResponse.json({ error: "You already submitted proof for this. Check your submissions." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
