import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewardSubmissions, rewardPayments, rewardTasks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromAuth } from "@/lib/route-auth";

// GET /api/rewards/my — my treasure submissions + payments
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = await db
      .select({
        id: rewardSubmissions.id,
        taskId: rewardSubmissions.taskId,
        proofUrl: rewardSubmissions.proofUrl,
        proofWallet: rewardSubmissions.proofWallet,
        proofUsername: rewardSubmissions.proofUsername,
        status: rewardSubmissions.status,
        adminNote: rewardSubmissions.adminNote,
        createdAt: rewardSubmissions.createdAt,
      })
      .from(rewardSubmissions)
      .where(eq(rewardSubmissions.userId, user.id))
      .orderBy(desc(rewardSubmissions.createdAt))
      .limit(50);

    const payments = await db
      .select({
        id: rewardPayments.id,
        taskId: rewardPayments.taskId,
        token: rewardPayments.token,
        amount: rewardPayments.amount,
        txSignature: rewardPayments.txSignature,
        status: rewardPayments.status,
        createdAt: rewardPayments.createdAt,
      })
      .from(rewardPayments)
      .where(eq(rewardPayments.userId, user.id))
      .orderBy(desc(rewardPayments.createdAt))
      .limit(50);

    // Attach task titles (fetch all tasks and map by id)
    const allTasks = await db.select().from(rewardTasks);
    const tasksById = new Map(allTasks.map((t) => [t.id, t.title]));

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        ...s,
        taskTitle: tasksById.get(s.taskId) || "Task",
      })),
      payments: payments.map((p) => ({ ...p, taskTitle: tasksById.get(p.taskId) || "Task" })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
