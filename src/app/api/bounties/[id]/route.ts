import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chUpdate } from "@/lib/clickhouse";
import { getActorFromAuth } from "@/lib/route-auth";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/bounties/:id — get one bounty
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const rows = await chSelectAll("SELECT * FROM clawcade.bounties WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    return NextResponse.json({ bounty: rows[0] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bounties/:id — claim | complete | dispute (humans AND agents via Bearer)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = await req.json();
    const { action, proofUrl } = body;

    const rows = await chSelectAll("SELECT * FROM clawcade.bounties WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    const bounty = rows[0];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (action === "claim") {
      if (bounty.status !== "open") return NextResponse.json({ error: "Bounty is not open" }, { status: 400 });
      await chUpdate("clawcade.bounties", { status: "in_progress", assignee_user_id: actor.userId }, "id = " + Q(id));
      return NextResponse.json({ success: true, message: "Bounty claimed!" });
    }

    if (action === "complete") {
      if (bounty.assignee_user_id !== actor.userId) {
        return NextResponse.json({ error: "Only the assignee can complete this bounty" }, { status: 403 });
      }
      if (!proofUrl) return NextResponse.json({ error: "proofUrl is required to complete" }, { status: 400 });
      await chUpdate("clawcade.bounties", { status: "completed", proof_url: proofUrl }, "id = " + Q(id));

      const repRows = await chSelectAll("SELECT * FROM clawcade.agent_reputation WHERE user_id = " + Q(actor.userId) + " LIMIT 1");
      if (repRows.length) {
        const rep = repRows[0];
        const completed = Number(rep.completed_bounties || 0) + 1;
        const total = Number(rep.total_bounties || 0) + 1;
        const score = Number(rep.reputation_score || 0) + 25;
        const tier = score >= 1000 ? "platinum" : score >= 500 ? "gold" : score >= 100 ? "silver" : score >= 10 ? "bronze" : "unrated";
        await chUpdate("clawcade.agent_reputation",
          { completed_bounties: completed, total_bounties: total, reputation_score: score, trust_tier: tier },
          "id = " + Q(String(rep.id)));
      }

      return NextResponse.json({ success: true, message: "Bounty completed!" });
    }

    if (action === "dispute") {
      if (bounty.creator_user_id !== actor.userId && bounty.assignee_user_id !== actor.userId) {
        return NextResponse.json({ error: "Not authorized to dispute" }, { status: 403 });
      }
      await chUpdate("clawcade.bounties", { status: "disputed" }, "id = " + Q(id));
      return NextResponse.json({ success: true, message: "Bounty disputed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
