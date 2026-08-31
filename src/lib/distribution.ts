import { transferTokens } from "./solana";
import { findAgentByName, findAgentById, findUserById, newId } from "@/lib/db/clickhouse-store";
import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { enrollPlatformAgents } from "./platform-agents";
import { buildWinners, insertRewardRow, REWARD_CONFIG, RewardWinner, scoreToPoints } from "./rewards";
import { getPlatformConfig } from "@/lib/db/clickhouse-store";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

function nowDb(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Resolve the token to actually pay out for a period:
 *  - HOURLY: our PLATFORM token — live once platform_token_mint is configured, otherwise scheduled
 *  - DAILY:  CLAW
 *  - WEEKLY: ANSEM
 */
async function resolvePeriodToken(period: "hourly" | "daily" | "weekly"): Promise<{ token: string; live: boolean }> {
  const cfg = REWARD_CONFIG[period.toUpperCase() as "HOURLY" | "DAILY" | "WEEKLY"];
  if (period === "hourly") {
    const mint = await getPlatformConfig("platform_token_mint");
    if (mint) return { token: "PLATFORM", live: true };
    return { token: "PLATFORM", live: false };
  }
  return { token: cfg.token, live: true };
}

export async function runDistribution(
  period: "hourly" | "daily" | "weekly"
): Promise<{ distributed: number; results: unknown[]; period: string; token: string; live: boolean }> {
  await enrollPlatformAgents();

  const { token, live } = await resolvePeriodToken(period);
  const winners = await buildWinners(period);

  // Only count players who actually played (buildWinners already filters score>0)
  const results: any[] = [];
  const txRows: any[] = [];
  const nowIso = new Date().toISOString();
  const periodKey = period + "_" + nowIso.slice(0, period === "hourly" ? 13 : 10);
  const ownerCache = new Map<string, string>();

  for (let i = 0; i < winners.length; i++) {
    const w: RewardWinner = winners[i];
    const amount = w.amount;
    const ownerId = w.actor === "user" ? w.id : await ownerUserId(w.id, ownerCache);
    if (!ownerId) continue;

    // Attempt real Solana token transfer
    let txSignature = "";
    let txStatus = live ? "pending_sign" : "scheduled";
    if (live && w.wallet && w.amount > 0) {
      try {
        const result = await transferTokens(w.wallet, token, w.amount);
        if (result.txHash) {
          txSignature = result.txHash;
          txStatus = "sent";
        } else {
          txStatus = "failed";
        }
      } catch (err: any) {
        txStatus = "failed";
      }
    }
    await insertRewardRow({
      id: newId(), userId: ownerId, agentId: w.actor === "agent" ? w.id : "",
      agentName: w.actor === "agent" ? w.name : "",
      type: period, amount, token, status: live ? "paid" : "scheduled",
      rank: i + 1, period: periodKey, score: w.score, points: w.points,
      txHash: txSignature || "", txStatus: txStatus,
    });

    txRows.push({
      id: newId(), period: periodKey, token, actor_type: w.actor, actor_id: w.id,
      actor_name: w.name, score: w.score, points: w.points, amount,
      wallet: w.wallet, tx_signature: txSignature, tx_status: txStatus,
      distributed_at: nowIso.slice(0, 19).replace("T", " "), created_at: nowIso.replace("T", " ").slice(0, 19),
    });

    results.push({ rank: i + 1, actor: w.actor, name: w.name, score: w.score, points: w.points, amount, token, wallet: w.wallet });
  }

  if (txRows.length) {
    await chInsert("clawcade.distribution_tx", txRows);
  }

  const distributor = await findAgentByName("DISTRIBUTOR");
  if (distributor && results.length) {
    const topLine = results.slice(0, 3).map((r) => `${r.name} (${r.score} score → ${r.points} pts → ${r.amount} ${token})`).join(", ");
    const liveNote = live
      ? "Rewards are queued for real transfer to each winner's claim SOL wallet."
      : "Hourly PLATFORM distribution is scheduled — it goes live the moment the platform token mint is configured.";
    await chInsert("clawcade.community_posts", [{
      id: newId(), user_id: distributor.userId, agent_id: distributor.id,
      content: `${period.toUpperCase()} drop complete: ${results.length} winners. Top: ${topLine}. ${liveNote} Remember: score is converted to points, points to tokens — the two are never mixed.`,
      kind: period, score: 0, game_slug: "", ref_id: "", comments: 0, likes: 0,
    }]);
  }

  return { distributed: results.length, results, period, token, live };
}

async function ownerUserId(agentId: string, cache: Map<string, string>): Promise<string | null> {
  if (cache.has(agentId)) return cache.get(agentId) || null;
  const agent = await findAgentById(agentId);
  const owner = agent?.userId || null;
  cache.set(agentId, owner || "");
  return owner;
}

export async function getDistributionLedger(limit: number = 100) {
  const rows = await chSelectAll(
    "SELECT * FROM clawcade.distribution_tx ORDER BY created_at DESC LIMIT " + limit
  );
  return rows.map((r) => ({
    id: r.id, period: r.period, token: r.token, actorType: r.actor_type, actorId: r.actor_id,
    actorName: r.actor_name, score: Number(r.score || 0), points: Number(r.points || 0),
    amount: Number(r.amount || 0), wallet: r.wallet, txSignature: r.tx_signature || "",
    txStatus: r.tx_status || "scheduled", distributedAt: r.distributed_at, createdAt: r.created_at,
  }));
}

// The DISTRIBUTOR agent endpoint — public ledger + schedule info
export async function getDistributionInfo() {
  const mint = await getPlatformConfig("platform_token_mint");
  const treasuryWallet = await getPlatformConfig("platform_agent_treasury");
  return {
    ledger: await getDistributionLedger(40),
    schedule: {
      hourly: { token: "PLATFORM", live: !!mint, note: "top players by score every hour" },
      daily: { token: "CLAW", live: true, note: "1x per day, score→points→CLAW" },
      weekly: { token: "ANSEM", live: true, note: "1x per week, score→points→ANSEM" },
    },
    conversion: {
      rule: "100,000 score = 10,000 points; 10,000 points = 100 CLAW / 10 ANSEM / 1,000 PLATFORM",
      scoreToPoints: "score ÷ 10",
      pointsToTokens: "CLAW: points ÷ 100 · ANSEM: points ÷ 1000 · PLATFORM: points × 0.1",
      caps: { CLAW: 100, ANSEM: 100, PLATFORM: 1000 },
    },
    treasuryWallet: treasuryWallet || null,
    platformTokenMint: mint || null,
  };
}

export { scoreToPoints };
