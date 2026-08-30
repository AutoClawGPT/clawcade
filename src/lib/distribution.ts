import { findAgentByName, findAgentById, newId } from "@/lib/db/clickhouse-store";
import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { enrollPlatformAgents } from "./platform-agents";
import { clampReward } from "./rewards";
import { clickhouseInsert } from "./clickhouse";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

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
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  const agentWinners = await chSelectAll(
    "SELECT id, name, reward_wallet AS wallet FROM clawcade.agents WHERE reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT 200"
  );
  const userWinners = await chSelectAll(
    "SELECT id, name, reward_wallet AS wallet FROM clawcade.users WHERE reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT 200"
  );

  const agentRows = agentWinners.length
    ? await chSelectAll(
        "SELECT agent_id AS id, coalesce(sum(score),0) AS s FROM clawcade.scores WHERE created_at >= '" + sinceStr + "' AND agent_id <> '' GROUP BY agent_id"
      )
    : [];
  const agentScoreMap = new Map(agentRows.map((r) => [String(r.id), Number(r.s) || 0]));

  const userRows = userWinners.length
    ? await chSelectAll(
        "SELECT user_id AS id, coalesce(sum(score),0) AS s FROM clawcade.scores WHERE created_at >= '" + sinceStr + "' AND agent_id = '' GROUP BY user_id"
      )
    : [];
  const userScoreMap = new Map(userRows.map((r) => [String(r.id), Number(r.s) || 0]));

  const combined = [
    ...agentWinners.map((a: any) => ({ key: "agent:" + a.id, actor: "agent", id: String(a.id), name: a.name, wallet: a.wallet, score: agentScoreMap.get(String(a.id)) || 0 })),
    ...userWinners.map((u: any) => ({ key: "user:" + u.id, actor: "user", id: String(u.id), name: u.name, wallet: u.wallet, score: userScoreMap.get(String(u.id)) || 0 })),
  ].filter((x) => x.wallet).sort((a, b) => b.score - a.score);

  const tiers = period === "hourly" ? [100, 50, 25] : period === "daily" ? [100, 80, 60, 40, 20, 10, 10, 10, 5, 5] : [100, 80, 60, 50, 40, 30, 20, 20, 10, 10];

  const results: any[] = [];
  const top = combined.slice(0, tiers.length);
  const nowIso = now.toISOString();
  for (let i = 0; i < top.length; i++) {
    const w = top[i];
    const amount = clampReward(tiers[i], token);
    const periodKey = period + "_" + nowIso.slice(0, period === "hourly" ? 13 : 10);
    const ownerId = w.actor === "user" ? w.id : await actorOwnerId(w.id);
    await chInsert("clawcade.rewards", [{
      id: newId(), user_id: ownerId || "", agent_id: w.actor === "agent" ? w.id : "",
      type: period, amount, token, status: "pending", rank: i + 1, period: periodKey,
      created_at: nowIso.slice(0, 19).replace("T", " "),
    }]);
    await upsertTreasury(token, amount);
    void clickhouseInsert("clawcade.reward_events", ["actor_type", "actor_id", "token", "amount", "reward_type"], [[w.actor, w.id, token, amount, period]]);
    results.push({ rank: i + 1, actor: w.actor, name: w.name, wallet: w.wallet, amount, token });
  }

  const distributor = await findAgentByName("DISTRIBUTOR");
  if (distributor && results.length) {
    const topLine = results.slice(0, 3).map((r) => `${r.name} (${r.amount} ${r.token})`).join(", ");
    await chInsert("clawcade.community_posts", [{
      id: newId(), user_id: distributor.userId, agent_id: distributor.id,
      content: `${period.toUpperCase()} drop complete: ${results.length} winners. Top: ${topLine}. Rewards land to the claim SOL wallet each winner provided. Rewards are capped to protect the treasury.`,
      kind: period, score: 0, game_slug: "", ref_id: "", comments: 0, likes: 0,
    }]);
  }

  return { distributed: results.length, results, period };
}

async function actorOwnerId(agentId: string): Promise<string | null> {
  const agent = await findAgentById(agentId);
  return agent?.userId || null;
}

async function upsertTreasury(token: string, amountDelta: number) {
  const { getPlatformConfig, upsertPlatformConfig } = await import("@/lib/db/clickhouse-store");
  const key = "treasury_" + token.toLowerCase();
  const prev = Number(await getPlatformConfig(key)) || 0;
  const next = Math.round((prev + amountDelta) * 1000) / 1000;
  await upsertPlatformConfig(key, String(next));
}
