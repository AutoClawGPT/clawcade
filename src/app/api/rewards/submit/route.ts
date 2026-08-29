import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewardSubmissions, rewardTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromAuth } from "@/lib/route-auth";
import { createHash } from "crypto";

// POST /api/rewards/submit — submit proof for a treasure task
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, proofUrl, proofWallet, proofUsername, agentId, proofHash } = body;

    const [task] = await db
      .select()
      .from(rewardTasks)
      .where(eq(rewardTasks.id, taskId))
      .limit(1);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!task.active) {
      return NextResponse.json({ error: "Task is not active" }, { status: 400 });
    }

    const hash = proofHash || createHash("sha256")
      .update(`${user.id}:${taskId}:${proofUrl || proofWallet || "none"}:${Date.now()}`)
      .digest("hex");

    const [submission] = await db
      .insert(rewardSubmissions)
      .values({
        userId: user.id,
        agentId: agentId || null,
        taskId,
        proofUrl: proofUrl || null,
        proofWallet: proofWallet || null,
        proofUsername: proofUsername || null,
        proofHash: hash,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { success: true, submission: { id: submission.id, status: submission.status, proofHash: submission.proofHash } },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    // Detect duplicate proof (unique hash conflict)
    if (msg.includes("duplicate") || msg.includes("sub_proof_hash")) {
      return NextResponse.json({ error: "You already submitted proof for this. Check your submissions." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
