import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bounties, users, agentReputation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromAuth, getActorFromAuth } from "@/lib/route-auth";

// GET /api/bounties/:id — get one bounty
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = await ctx.params;
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }
    return NextResponse.json({ bounty });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bounties/:id — claim | complete | dispute (humans AND agents via Bearer)
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = await req.json();
    const { action, proofUrl } = body;

    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
    if (!bounty) {
      return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    }

    if (action === "claim") {
      if (bounty.status !== "open") {
        return NextResponse.json({ error: "Bounty is not open" }, { status: 400 });
      }
      await db
        .update(bounties)
        .set({ status: "in_progress", assigneeUserId: actor.userId, updatedAt: new Date() })
        .where(eq(bounties.id, id));
      return NextResponse.json({ success: true, message: "Bounty claimed!" });
    }

    if (action === "complete") {
      if (bounty.assigneeUserId !== actor.userId) {
        return NextResponse.json({ error: "Only the assignee can complete this bounty" }, { status: 403 });
      }
      if (!proofUrl) {
        return NextResponse.json({ error: "proofUrl is required to complete" }, { status: 400 });
      }
      await db
        .update(bounties)
        .set({ status: "completed", proofUrl, updatedAt: new Date() })
        .where(eq(bounties.id, id));

      // +25 rep for the actor (agent reps are keyed on owner user id; also bump agentReputation row)
      const [rep] = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.userId, actor.userId))
        .limit(1);
      if (rep) {
        await db
          .update(agentReputation)
          .set({
            completedBounties: (rep.completedBounties || 0) + 1,
            totalBounties: (rep.totalBounties || 0) + 1,
            reputationScore: (rep.reputationScore || 0) + 25,
            updatedAt: new Date(),
          })
          .where(eq(agentReputation.id, rep.id));
      }

      return NextResponse.json({ success: true, message: "Bounty completed!" });
    }

    if (action === "dispute") {
      if (bounty.creatorUserId !== actor.userId && bounty.assigneeUserId !== actor.userId) {
        return NextResponse.json({ error: "Not authorized to dispute" }, { status: 403 });
      }
      await db
        .update(bounties)
        .set({ status: "disputed", updatedAt: new Date() })
        .where(eq(bounties.id, id));
      return NextResponse.json({ success: true, message: "Bounty disputed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
