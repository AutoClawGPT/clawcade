import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { newId } from "@/lib/db/clickhouse-store";

export const REWARD_CAPS = {
  MAX_SINGLE: 1000,
  CLAW_MAX: 100,
  ANSEM_MAX: 100,
  PLATFORM_MAX: 1000,
};

export function clampReward(amount: number, token: string): number {
  const capped = Math.max(0, Math.floor(amount));
  const tokenCap =
    token === "CLAW" ? REWARD_CAPS.CLAW_MAX :
    token === "ANSEM" ? REWARD_CAPS.ANSEM_MAX :
    token === "PLATFORM" ? REWARD_CAPS.PLATFORM_MAX :
    REWARD_CAPS.MAX_SINGLE;
  return Math.min(capped, tokenCap);
}

export const REWARD_CONFIG = {
  HOURLY: { topN: 3, amounts: [100, 50, 25], token: "CLAW", intervalMs: 60 * 60 * 1000 },
  DAILY: { topN: 10, amounts: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10], token: "CLAW", intervalMs: 24 * 60 * 60 * 1000 },
  WEEKLY: { topN: null, baseAmount: 20, bonusPerScore: 0.002, token: "ANSEM", intervalMs: 7 * 24 * 60 * 60 * 1000 },
};

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

export async function getTopPlayers(
  period: "hourly" | "daily" | "weekly" | "alltime",
  limit: number = 10,
  gameId?: string
) {
  const now = new Date();
  let since: Date;
  switch (period) {
    case "hourly": since = new Date(now.getTime() - 60 * 60 * 1000); break;
    case "daily": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "weekly": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(0);
  }
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");
  const gameClause = gameId ? " AND s.game_id = " + Q(gameId) : "";
  const sql = `SELECT s.user_id AS "userId", sum(s.score) AS total_score, count() AS games_played,
                      u.name AS user_name, u.image AS user_image, u.wallet_address AS wallet_address
               FROM clawcade.scores s
               LEFT JOIN clawcade.users u ON s.user_id = u.id
               WHERE s.created_at >= '${sinceStr}' AND s.agent_id = ''${gameClause}
               GROUP BY s.user_id, u.name, u.image, u.wallet_address
               ORDER BY total_score DESC LIMIT ${limit}`;
  return chSelectAll(sql);
}

export async function distributeHourlyRewards() {
  const config = REWARD_CONFIG.HOURLY;
  const topPlayers = await getTopPlayers("hourly", config.topN);
  const results = [];
  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const amount = clampReward(config.amounts[i], config.token);
    if (!player.wallet_address) continue;
    const id = newId();
    await insertRewardRow({ id, userId: String(player.userId), type: "hourly", amount, token: config.token, status: "pending", rank: i + 1, period: "hourly_" + new Date().toISOString().slice(0, 13) });
    results.push({ rank: i + 1, userId: player.userId, userName: player.user_name, amount, token: config.token, rewardId: id });
  }
  return results;
}

export async function distributeDailyRewards() {
  const config = REWARD_CONFIG.DAILY;
  const topPlayers = await getTopPlayers("daily", config.topN);
  const results = [];
  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const amount = clampReward(config.amounts[i], config.token);
    if (!player.wallet_address) continue;
    const id = newId();
    await insertRewardRow({ id, userId: String(player.userId), type: "daily", amount, token: config.token, status: "pending", rank: i + 1, period: "daily_" + new Date().toISOString().slice(0, 10) });
    results.push({ rank: i + 1, userId: player.userId, userName: player.user_name, amount, token: config.token });
  }
  return results;
}

export async function distributeWeeklyRewards() {
  const config = REWARD_CONFIG.WEEKLY;
  const allActive = await getTopPlayers("weekly", 1000);
  const results = [];
  for (const player of allActive) {
    if (!player.wallet_address) continue;
    const amount = clampReward(Math.floor(config.baseAmount + Number(player.total_score) * config.bonusPerScore), config.token);
    await insertRewardRow({ id: newId(), userId: String(player.userId), type: "weekly", amount, token: config.token, status: "pending", rank: 0, period: "weekly_" + new Date().toISOString().slice(0, 10) });
    results.push({ userId: player.userId, userName: player.user_name, amount, token: config.token });
  }
  return results;
}

export async function getUserRewards(userId: string, limit: number = 50) {
  return chSelectAll("SELECT * FROM clawcade.rewards WHERE user_id = " + Q(userId) + " ORDER BY created_at DESC LIMIT " + limit);
}

export async function getTotalRewardsDistributed() {
  return chSelectAll("SELECT token, sum(amount) AS total, count() AS count FROM clawcade.rewards GROUP BY token");
}

export const TOKEN_INFO = {
  CLAW: { symbol: "CLAW", name: "ClawCade Token", address: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump", chain: "Solana (pump.fun)", live: true },
  ANSEM: { symbol: "ANSEM", name: "Ansem Token", address: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump", chain: "Solana (pump.fun)", live: true },
};

async function insertRewardRow(data: { id: string; userId: string; type: string; amount: number; token: string; status: string; rank: number; period: string }) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await chInsert("clawcade.rewards", [{
    id: data.id, user_id: data.userId, agent_id: "", type: data.type, amount: data.amount,
    token: data.token, status: data.status, rank: data.rank, period: data.period, created_at: now,
  }]);
}

