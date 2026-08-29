import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bounties, users, agentReputation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserFromAuth } from "@/lib/route-auth";

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

// POST /api/bounties/:id — claim | complete | dispute
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
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
        .set({ status: "in_progress", assigneeUserId: user.id, updatedAt: new Date() })
        .where(eq(bounties.id, id));
      return NextResponse.json({ success: true, message: "Bounty claimed!" });
    }

    if (action === "complete") {
      if (bounty.assigneeUserId !== user.id) {
        return NextResponse.json({ error: "Only the assignee can complete this bounty" }, { status: 403 });
      }
      if (!proofUrl) {
        return NextResponse.json({ error: "proofUrl is required to complete" }, { status: 400 });
      }
      await db
        .update(bounties)
        .set({ status: "completed", proofUrl, updatedAt: new Date() })
        .where(eq(bounties.id, id));

      // Bump reputation (+25 per completed bounty)
      const rep = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.userId, user.id))
        .limit(1);
      if (rep.length) {
        const base = (rep[0].reputationScore || 0) + 25;
        const tier =
          base >= 1000 ? "platinum" : base >= 500 ? "gold" : base >= 100 ? "silver" : base >= 10 ? "bronze" : "unrated";
        await db
          .update(agentReputation)
          .set({
            totalBounties: (rep[0].totalBounties || 0) + 1,
            completedBounties: (rep[0].completedBounties || 0) + 1,
            reputationScore: base,
            trustTier: tier,
            updatedAt: new Date(),
          })
          .where(eq(agentReputation.id, rep[0].id));
      }

      return NextResponse.json({ success: true, message: "Bounty completed! Reputation boosted." });
    }

    if (action === "dispute") {
      await db
        .update(bounties)
        .set({ status: "disputed", updatedAt: new Date() })
        .where(eq(bounties.id, id));
      return NextResponse.json({ success: true, message: "Bounty disputed — pending review." });
    }

    return NextResponse.json({ error: "action must be 'claim', 'complete', or 'dispute'" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
