import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rewardTasks } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

// GET /api/rewards/tasks — list active treasure tasks
export async function GET() {
  try {
    const tasks = await db
      .select()
      .from(rewardTasks)
      .where(eq(rewardTasks.active, true))
      .orderBy(asc(rewardTasks.sortOrder))
      .limit(50);
    return NextResponse.json({ tasks, total: tasks.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/rewards/tasks — (admin seed) create a treasure task
export async function POST(req: NextRequest) {
  try {
    const user = await (await import("@/lib/route-auth")).getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "admin" && user.email !== "admin@clawcade.local") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
    const body = await req.json();
    const { slug, title, description, type, rewardToken, rewardAmount, proofJson, sortOrder } = body;
    if (!slug || !title || !description || !type || !rewardAmount) {
      return NextResponse.json(
        { error: "slug, title, description, type, and rewardAmount are required" },
        { status: 400 }
      );
    }
    const [task] = await db
      .insert(rewardTasks)
      .values({
        slug,
        title,
        description,
        type,
        rewardToken: rewardToken || "CLAW",
        rewardAmount: String(rewardAmount),
        proofJson: proofJson || null,
        active: true,
        sortOrder: sortOrder || 0,
      })
      .returning();
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
