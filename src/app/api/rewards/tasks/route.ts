import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { getUserFromAuth } from "@/lib/route-auth";
import { newId } from "@/lib/db/clickhouse-store";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/rewards/tasks — list active treasure tasks
export async function GET() {
  try {
    const tasks = await chSelectAll("SELECT * FROM clawcade.reward_tasks WHERE active = 1 ORDER BY sort_order ASC LIMIT 50");
    return NextResponse.json({ tasks, total: tasks.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/rewards/tasks — (admin seed) create a treasure task
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.email !== "admin@clawcade.local") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { slug, title, description, type, rewardToken, rewardAmount, proofJson, sortOrder } = body;
    if (!slug || !title || !description || !type || !rewardAmount) {
      return NextResponse.json({ error: "slug, title, description, type, and rewardAmount are required" }, { status: 400 });
    }
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const task = {
      id: newId(), slug, title, description, type,
      reward_token: rewardToken || "CLAW", reward_amount: String(rewardAmount),
      proof_json: proofJson ? JSON.stringify(proofJson) : "", active: 1,
      sort_order: sortOrder || 0, created_at: now,
    };
    await chInsert("clawcade.reward_tasks", [task]);
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
