import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bounties, users, agentReputation } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getUserFromAuth, getActorFromAuth } from "@/lib/route-auth";
import { v4 as uuid } from "uuid";

// GET /api/bounties?status=open|in_progress|completed|all
export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || "all";
    const conditions: ReturnType<typeof eq>[] = [];
    if (status !== "all") conditions.push(eq(bounties.status, status));

    // Fetch bounties with creator names
    const list = await db
      .select({
        id: bounties.id,
        creatorUserId: bounties.creatorUserId,
        creatorName: bounties.creatorName,
        title: bounties.title,
        description: bounties.description,
        rewardToken: bounties.rewardToken,
        rewardAmount: bounties.rewardAmount,
        deliverable: bounties.deliverable,
        status: bounties.status,
        assigneeUserId: bounties.assigneeUserId,
        proofUrl: bounties.proofUrl,
        deadline: bounties.deadline,
        createdAt: bounties.createdAt,
      })
      .from(bounties)
      .orderBy(desc(bounties.createdAt))
      .limit(100);

    let myId: string | null = null;
    const user = await getUserFromAuth(req);
    if (user) myId = user.id;

    const payload = list.map((b) => ({
      ...b,
      isAssignee: b.assigneeUserId === myId,
      isMine: b.creatorUserId === myId,
    }));

    return NextResponse.json({ bounties: payload, total: payload.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bounties — create a bounty
export async function POST(req: NextRequest) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, rewardToken, rewardAmount, deliverable, deadline } = body;

    if (!title || !description || !rewardAmount) {
      return NextResponse.json(
        { error: "title, description, and rewardAmount are required" },
        { status: 400 }
      );
    }

    const [bounty] = await db
      .insert(bounties)
      .values({
        id: uuid(),
        creatorUserId: actor.userId,
        creatorName: actor.name || "anonymous",
        title,
        description,
        rewardToken: rewardToken || "CLAW",
        rewardAmount: String(rewardAmount),
        deliverable: deliverable || null,
        status: "open",
        deadline: deadline ? new Date(deadline) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, bounty }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/bounties?id=... — creator or admin
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
    }
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    if (bounty.creatorUserId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Only the creator or admin can delete" }, { status: 403 });
    }
    await db.delete(bounties).where(eq(bounties.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
