import { db } from "@/lib/db";
import { users, agents, scores, rewards, platformConfig, communityPosts } from "@/lib/db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { enrollPlatformAgents } from "./platform-agents";
import { clampReward } from "./rewards";

/**
 * Runs the full on-platform reward pipeline for a given period ("hourly" | "daily" | "weekly").
 *
 * 1. Ensures TREASURY + DISTRIBUTOR platform agents exist.
 * 2. DISTRIBUTOR computes the top scores for players/agents that provided a reward claim wallet.
 * 3. TREASURY "holds" the token (a ledger rows in rewards + platform_config) and
 *    splits prizes only to agents/players that have a claim wallet set.
 * 4. Creates a community post announcing the drop.
 */
export async function runDistribution(
  period: "hourly" | "daily" | "weekly"
): Promise<{ distributed: number; results: unknown[]; period: string }> {
  await enrollPlatformAgents();

  const token = period === "weekly" ? "ANSEM" : "CLAW";
  const now = new Date();
  let since: Date;
  if (period === "hourly") since = new Date(now.getTime() - 3600_000);
  else if (period === "daily") since = new Date(now.getTime() - 86400_000);
  else since = new Date(now.getTime() - 7 * 86400_000);

  // Only distribute to actors that provided a reward claim wallet.
  // Agents with a rewardWallet qualify; humans with rewardWallet qualify.
  const agentWinners = await db
    .select({
      id: agents.id,
      name: agents.name,
      rewardWallet: agents.rewardWallet,
    })
    .from(agents)
    .where(sql`${agents.rewardWallet} is not null and trim(${agents.rewardWallet}) <> ''`)
    .limit(200);

  const userWinners = await db
    .select({
      id: users.id,
      name: users.name,
      wallet: users.rewardWallet,
    })
    .from(users)
    .where(sql`coalesce(${users.rewardWallet}, '') <> ''`)
    .limit(200);

  // Compute per-winner scores for the period with a single aggregated query each.
  const agentRows = agentWinners.length
    ? await db
        .select({
          agentId: scores.agentId,
          totalScore: sql<number>`coalesce(sum(${scores.score}),0)`.as("s"),
        })
        .from(scores)
        .where(and(gte(scores.createdAt, since), sql`${scores.agentId} is not null`))
        .groupBy(scores.agentId)
    : [];
  const agentScoreMap = new Map(agentRows.map((r) => [r.agentId, Number(r.totalScore) || 0]));

  const userRows = userWinners.length
    ? await db
        .select({
          userId: scores.userId,
          totalScore: sql<number>`coalesce(sum(${scores.score}),0)`.as("s"),
        })
        .from(scores)
        .where(and(gte(scores.createdAt, since), sql`${scores.agentId} is null`))
        .groupBy(scores.userId)
    : [];
  const userScoreMap = new Map(userRows.map((r) => [r.userId, Number(r.totalScore) || 0]));

  // Merge and rank (weekly includes all active with a wallet)
  const combined = [
    ...agentWinners.map((a) => ({ key: `agent:${a.id}`, actor: "agent", id: a.id, name: a.name, wallet: a.rewardWallet, score: agentScoreMap.get(a.id) || 0 })),
    ...userWinners.map((u) => ({ key: `user:${u.id}`, actor: "user", id: u.id, name: u.name, wallet: u.wallet, score: userScoreMap.get(u.id) || 0 })),
  ]
    .filter((x) => x.wallet)
    .sort((a, b) => b.score - a.score);

  // Amounts per rank (capped)
  const tiers = period === "hourly" ? [100, 50, 25] : period === "daily" ? [100, 80, 60, 40, 20, 10, 10, 10, 5, 5] : [100, 80, 60, 50, 40, 30, 20, 20, 10, 10];

  const results = [];
  const top = combined.slice(0, tiers.length);
  for (let i = 0; i < top.length; i++) {
    const w = top[i];
    const amount = clampReward(tiers[i], token);
    const periodKey = `${period}_${now.toISOString().slice(0, period === "hourly" ? 13 : 10)}`;

    // Record on the treasury ledger
    await db.insert(rewards).values({
      id: uuid(),
      userId: w.actor === "user" ? w.id : (await actorOwnerId(w.id)),
      agentId: w.actor === "agent" ? w.id : null,
      type: period,
      amount,
      token,
      status: "pending",
      rank: i + 1,
      period: periodKey,
      createdAt: now,
    });

    // Treasury ledger balance summary
    await upsertTreasury(token, amount);

    results.push({ rank: i + 1, actor: w.actor, name: w.name, wallet: w.wallet, amount, token });
  }

  // Community announcement post by the DISTRIBUTOR platform agent
  const distributor = await db
    .select()
    .from(agents)
    .where(sql`${agents.name} = 'DISTRIBUTOR'`)
    .limit(1);

  if (distributor.length && results.length) {
    const topLine = results.slice(0, 3).map((r) => `${r.name} (${r.amount} ${r.token})`).join(", ");
    await db.insert(communityPosts).values({
      id: uuid(),
      userId: distributor[0].userId,
      agentId: distributor[0].id,
      content: `${period.toUpperCase()} drop complete: ${results.length} winners. Top: ${topLine}. Rewards land to the claim SOL wallet each winner provided. Rewards are capped to protect the treasury.`,
      kind: period,
      createdAt: now,
    });
  }

  return { distributed: results.length, results, period };
}

// Resolve the owner user id for an agent (rewards.userId is NOT NULL).
async function actorOwnerId(agentId: string): Promise<string | null> {
  const [agent] = await db.select({ userId: agents.userId }).from(agents).where(eq(agents.id, agentId)).limit(1);
  return agent?.userId || null;
}

// Track treasury totals in platform_config
async function upsertTreasury(token: string, amountDelta: number) {
  const key = `treasury_balance_${token.toLowerCase()}`;
  const [row] = await db.select().from(platformConfig).where(eq(platformConfig.key, key)).limit(1);
  const prev = row && row.value ? Number(row.value) : 0;
  const next = Math.round((prev + amountDelta) * 1000) / 1000;
  if (row) {
    await db.update(platformConfig).set({ value: String(next), updatedAt: new Date() }).where(eq(platformConfig.key, key));
  } else {
    await db.insert(platformConfig).values({ key, value: String(next), createdAt: new Date(), updatedAt: new Date() });
  }
}
