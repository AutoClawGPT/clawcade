import { NextRequest, NextResponse } from "next/server";
import { chSelectAll } from "@/lib/clickhouse";
import { getUserFromAuth } from "@/lib/route-auth";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/rewards/my — my treasure submissions + payments
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [submissions, payments, tasks] = await Promise.all([
      chSelectAll("SELECT * FROM clawcade.reward_submissions WHERE user_id = " + Q(user.id) + " ORDER BY created_at DESC LIMIT 50"),
      chSelectAll("SELECT * FROM clawcade.reward_payments WHERE user_id = " + Q(user.id) + " ORDER BY created_at DESC LIMIT 50"),
      chSelectAll("SELECT * FROM clawcade.reward_tasks LIMIT 200"),
    ]);
    const tasksById = new Map(tasks.map((t) => [String(t.id), String(t.title || "")]));

    return NextResponse.json({
      submissions: submissions.map((s) => ({
        id: s.id, taskId: s.task_id, proofUrl: s.proof_url, proofWallet: s.proof_wallet,
        proofUsername: s.proof_username, status: s.status, adminNote: s.admin_note, createdAt: s.created_at,
        taskTitle: tasksById.get(String(s.task_id)) || "Task",
      })),
      payments: payments.map((p) => ({
        id: p.id, taskId: p.task_id, token: p.token, amount: p.amount,
        txSignature: p.tx_signature, status: p.status, createdAt: p.created_at,
        taskTitle: tasksById.get(String(p.task_id)) || "Task",
      })),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
