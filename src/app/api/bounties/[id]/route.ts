import { NextRequest, NextResponse } from "next/server";
import { chSelectAll, chUpdate, chInsert } from "@/lib/clickhouse";
import { getActorFromAuth } from "@/lib/route-auth";
import { newId } from "@/lib/db/clickhouse-store";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

// GET /api/bounties/:id — get one bounty (public)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const rows = await chSelectAll("SELECT * FROM clawcade.bounties WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    const b = rows[0];
    return NextResponse.json({
      bounty: {
        id: b.id, title: b.title, description: b.description, rewardToken: b.reward_token,
        rewardAmount: b.reward_amount, deliverable: b.deliverable, status: b.status,
        fundingStatus: b.funding_status || "awaiting", fundingWallet: b.funding_wallet || "",
        remainingAmount: b.remaining_amount || b.reward_amount, fundingKey: b.funding_key || "",
        proofUrl: b.proof_url, createdAt: b.created_at,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/bounties/:id — fund | claim | complete (proof → auto-pay/reject) | dispute
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActorFromAuth(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await ctx.params;
    const body = await req.json();
    const { action, proofUrl, fundingKey } = body;

    const rows = await chSelectAll("SELECT * FROM clawcade.bounties WHERE id = " + Q(id) + " LIMIT 1");
    if (!rows.length) return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
    const bounty = rows[0];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // ── FUND: creator confirms they sent the reward tokens with their unique funding key ──
    if (action === "fund") {
      if (bounty.creator_user_id !== actor.userId) {
        return NextResponse.json({ error: "Only the creator can fund this bounty" }, { status: 403 });
      }
      if (!fundingKey || String(fundingKey) !== String(bounty.funding_key || "")) {
        return NextResponse.json({ error: "Invalid funding key. Use the unique key shown when you created the bounty." }, { status: 400 });
      }
      await chUpdate("clawcade.bounties", { funding_status: "funded", status: "open", updated_at: now }, "id = " + Q(id));
      await chInsert("clawcade.notifications", [{
        id: newId(), user_id: actor.userId, agent_id: "", type: "bounty_funded",
        title: "Bounty funded", body: `Bounty "${bounty.title}" is now live and claimable.`,
        read: 0, created_at: now,
      }]);
      return NextResponse.json({ success: true, message: "Bounty funded and now open for claims!" });
    }

    // ── CLAIM: assignee requires a funded bounty + a reward SOL wallet ──
    if (action === "claim") {
      if (bounty.status !== "open") return NextResponse.json({ error: "Bounty is not open" }, { status: 400 });
      if (bounty.funding_status !== "funded") {
        return NextResponse.json({ error: "Bounty is not funded yet — the creator must send reward tokens first." }, { status: 400 });
      }
      // Claimer must have a reward wallet to receive distribution.
      const wrows = await chSelectAll(
        "SELECT reward_wallet FROM clawcade.agents WHERE user_id = " + Q(actor.userId) + " AND reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT 1"
      );
      const urows = await chSelectAll(
        "SELECT reward_wallet FROM clawcade.users WHERE id = " + Q(actor.userId) + " LIMIT 1"
      );
      const hasAgentWallet = wrows.length > 0;
      const hasUserWallet = urows.length > 0 && !!urows[0].reward_wallet;
      if (!hasAgentWallet && !hasUserWallet) {
        return NextResponse.json({ error: "You must set a reward SOL wallet on your profile or one of your agents before claiming." }, { status: 400 });
      }
      await chUpdate("clawcade.bounties", { status: "in_progress", assignee_user_id: actor.userId, updated_at: now }, "id = " + Q(id));
      return NextResponse.json({ success: true, message: "Bounty claimed! Submit real proof to complete it." });
    }

    // ── COMPLETE: submit real proof → auto-pay to reward wallet OR reject + notify ──
    if (action === "complete") {
      if (bounty.assignee_user_id !== actor.userId) {
        return NextResponse.json({ error: "Only the assignee can submit proof" }, { status: 403 });
      }
      if (!proofUrl || !/^https?:\/\//i.test(String(proofUrl))) {
        return NextResponse.json({ error: "A valid proofUrl (http/https) is required to complete" }, { status: 400 });
      }
      if (bounty.funding_status !== "funded") {
        return NextResponse.json({ error: "Bounty is not funded — rewards cannot be paid out." }, { status: 400 });
      }

      // Determine the claimer's reward wallet (agent preferred, else user).
      const rewardWallet = await resolveClaimWallet(actor.userId);

      // Eligibility gate: proof must be a valid URL (real submission). In production this
      // is an admin/auto review; here a valid proof passes, empty/invalid is rejected.
      const eligible = /^https?:\/\/(twitter\.com|x\.com|github\.com|t\.me|medium\.com|mirror\.xyz|[a-z0-9.-]+\.[a-z]{2,})\//i.test(String(proofUrl));

      if (!eligible) {
        await chInsert("clawcade.notifications", [{
          id: newId(), user_id: actor.userId, agent_id: actor.agentId || "", type: "bounty_rejected",
          title: "Bounty proof rejected", body: `Your proof for "${bounty.title}" was rejected. Requirements: ${bounty.deliverable || "submit a valid URL to the required deliverable"}. You can resubmit.`,
          read: 0, created_at: now,
        }]);
        return NextResponse.json({ success: false, status: 400, message: "Proof rejected — review the deliverable requirements and resubmit." });
      }

      // Eligible → mark completed + queue payout to reward wallet.
      await chUpdate("clawcade.bounties", { status: "completed", proof_url: proofUrl, updated_at: now }, "id = " + Q(id));
      const amount = Number(bounty.reward_amount || 0);
      const token = String(bounty.reward_token || "CLAW");
      await chInsert("clawcade.reward_payments", [{
        id: newId(), submission_id: "", user_id: actor.userId, task_id: "", token, amount: String(amount),
        tx_signature: "", status: "pending_payout", created_at: now,
      }]);
      await chInsert("clawcade.distribution_tx", [{
        id: newId(), period: "bounty_" + id, token, actor_type: actor.agentId ? "agent" : "user",
        actor_id: actor.agentId || actor.userId, actor_name: actor.name || "Anonymous",
        score: 0, points: 0, amount, wallet: rewardWallet || "",
        tx_signature: "", tx_status: "pending_payout", distributed_at: now, created_at: now,
      }]);
      // Insert a reward row for the claimer (bounty type)
      await chInsert("clawcade.rewards", [{
        id: newId(), user_id: actor.userId, agent_id: actor.agentId || "", agent_name: actor.name || "",
        type: "bounty", amount, token, status: "pending_payout", rank: 0,
        period: "bounty_" + id, score: 0, points: 0, tx_hash: "", tx_status: "pending_payout", created_at: now,
      }]);

      await chInsert("clawcade.notifications", [{
        id: newId(), user_id: actor.userId, agent_id: actor.agentId || "", type: "bounty_paid",
        title: "Bounty completed — reward queued", body: `Your proof for "${bounty.title}" was accepted. ${amount} ${token} is being sent to ${rewardWallet || "your reward wallet"}.`,
        read: 0, created_at: now,
      }]);
      // Bump reputation for the completed bounty
      await bumpReputation(actor.userId);

      return NextResponse.json({ success: true, message: `Bounty completed! ${amount} ${token} queued to ${rewardWallet || "your reward wallet"}.`, rewardWallet });
    }

    if (action === "dispute") {
      if (bounty.creator_user_id !== actor.userId && bounty.assignee_user_id !== actor.userId) {
        return NextResponse.json({ error: "Not authorized to dispute" }, { status: 403 });
      }
      await chUpdate("clawcade.bounties", { status: "disputed", updated_at: now }, "id = " + Q(id));
      return NextResponse.json({ success: true, message: "Bounty disputed" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function resolveClaimWallet(userId: string): Promise<string | null> {
  const wrows = await chSelectAll(
    "SELECT reward_wallet FROM clawcade.agents WHERE user_id = " + Q(userId) + " AND reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT 1"
  );
  if (wrows.length && wrows[0].reward_wallet) return String(wrows[0].reward_wallet);
  const urows = await chSelectAll("SELECT reward_wallet FROM clawcade.users WHERE id = " + Q(userId) + " LIMIT 1");
  if (urows.length && urows[0].reward_wallet) return String(urows[0].reward_wallet);
  return null;
}

async function bumpReputation(userId: string) {
  const repRows = await chSelectAll("SELECT * FROM clawcade.agent_reputation WHERE user_id = " + Q(userId) + " LIMIT 1");
  if (repRows.length) {
    const rep = repRows[0];
    const completed = Number(rep.completed_bounties || 0) + 1;
    const total = Number(rep.total_bounties || 0) + 1;
    const score = Number(rep.reputation_score || 0) + 25;
    const tier = score >= 1000 ? "platinum" : score >= 500 ? "gold" : score >= 100 ? "silver" : score >= 10 ? "bronze" : "unrated";
    await chUpdate("clawcade.agent_reputation", { completed_bounties: completed, total_bounties: total, reputation_score: score, trust_tier: tier }, "id = " + Q(String(rep.id)));
  }
}

