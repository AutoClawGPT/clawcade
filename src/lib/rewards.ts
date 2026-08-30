import { chSelectAll, chInsert } from "@/lib/clickhouse";
import { newId } from "@/lib/db/clickhouse-store";

// ── Score → Points → Token conversion (NEVER mix score with tokens) ──
// 100,000 score  = 10,000 points
// 10,000 points  =   100 CLAW   (points / 100)
// 10,000 points  =    10 ANSEM  (points / 1000)
// 10,000 points  = 1,000 PLATFORM (points * 0.1)
export const SCORE_TO_POINTS_DIVISOR = 10;
export function scoreToPoints(score: number): number {
  return Math.max(0, Math.floor(Number(score) / SCORE_TO_POINTS_DIVISOR));
}

export function pointsToTokens(points: number, token: string): number {
  const p = Math.max(0, Math.floor(Number(points)));
  if (token === "CLAW") return Math.floor(p / 100);
  if (token === "ANSEM") return Math.floor(p / 1000);
  if (token === "PLATFORM") return Math.floor(p * 0.1);
  return Math.floor(p / 100);
}

export function scoreToTokens(score: number, token: string): number {
  return pointsToTokens(scoreToPoints(score), token);
}

// ── Caps ──
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
  // Hourly drop = our PLATFORM token (lights up when mint is configured)
  HOURLY: { token: "PLATFORM", intervalMs: 60 * 60 * 1000 },
  // Daily drop = CLAW (1x per day)
  DAILY: { token: "CLAW", intervalMs: 24 * 60 * 60 * 1000 },
  // Weekly drop = ANSEM (1x per week)
  WEEKLY: { token: "ANSEM", intervalMs: 7 * 24 * 60 * 60 * 1000 },
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

export interface RewardWinner {
  actor: "agent" | "user";
  id: string;
  name: string;
  wallet: string;
  score: number;
  points: number;
  amount: number;
  token: string;
}

/**
 * Build the full winner list for a distribution period using the
 * score → points → token conversion (tokens are NEVER the score).
 * Only players/agents that provided a reward SOL wallet are eligible.
 */
export async function buildWinners(
  period: "hourly" | "daily" | "weekly",
  limit: number = 500
): Promise<RewardWinner[]> {
  const token = REWARD_CONFIG[period.toUpperCase() as "HOURLY" | "DAILY" | "WEEKLY"].token;
  const now = new Date();
  let since: Date;
  if (period === "hourly") since = new Date(now.getTime() - 3600_000);
  else if (period === "daily") since = new Date(now.getTime() - 86400_000);
  else since = new Date(now.getTime() - 7 * 86400_000);
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  const agentWinners = await chSelectAll(
    "SELECT id, name, reward_wallet AS wallet FROM clawcade.agents WHERE reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT " + limit
  );
  const userWinners = await chSelectAll(
    "SELECT id, name, reward_wallet AS wallet FROM clawcade.users WHERE reward_wallet IS NOT NULL AND trim(reward_wallet) <> '' LIMIT " + limit
  );

  const agentScoreMap = new Map<string, number>();
  if (agentWinners.length) {
    const rows = await chSelectAll(
      "SELECT agent_id AS id, coalesce(sum(score),0) AS s FROM clawcade.scores WHERE created_at >= '" + sinceStr + "' AND agent_id <> '' GROUP BY agent_id"
    );
    rows.forEach((r) => agentScoreMap.set(String(r.id), Number(r.s) || 0));
  }

  const userScoreMap = new Map<string, number>();
  if (userWinners.length) {
    const rows = await chSelectAll(
      "SELECT user_id AS id, coalesce(sum(score),0) AS s FROM clawcade.scores WHERE created_at >= '" + sinceStr + "' AND agent_id = '' GROUP BY user_id"
    );
    rows.forEach((r) => userScoreMap.set(String(r.id), Number(r.s) || 0));
  }

  const combined: RewardWinner[] = [
    ...agentWinners.map((a: any) => {
      const score = agentScoreMap.get(String(a.id)) || 0;
      const points = scoreToPoints(score);
      return {
        actor: "agent" as const, id: String(a.id), name: String(a.name || "Agent"), wallet: String(a.wallet || ""),
        score, points, amount: clampReward(pointsToTokens(points, token), token), token,
      };
    }),
    ...userWinners.map((u: any) => {
      const score = userScoreMap.get(String(u.id)) || 0;
      const points = scoreToPoints(score);
      return {
        actor: "user" as const, id: String(u.id), name: String(u.name || "Player"), wallet: String(u.wallet || ""),
        score, points, amount: clampReward(pointsToTokens(points, token), token), token,
      };
    }),
  ]
    .filter((x) => x.wallet && x.score > 0 && x.amount > 0)
    .sort((a, b) => b.score - a.score);

  return combined;
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
  PLATFORM: { symbol: "CLAWCADE", name: "ClawCade Platform Token", address: null, chain: "Solana (TBD)", live: false },
};

export async function insertRewardRow(data: {
  id: string; userId: string; agentId?: string; agentName?: string; type: string;
  amount: number; token: string; status: string; rank: number; period: string;
  score?: number; points?: number; txHash?: string; txStatus?: string;
}) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await chInsert("clawcade.rewards", [{
    id: data.id, user_id: data.userId, agent_id: data.agentId || "",
    agent_name: data.agentName || "", type: data.type, amount: data.amount,
    token: data.token, status: data.status, rank: data.rank, period: data.period,
    score: data.score || 0, points: data.points || 0,
    tx_hash: data.txHash || "", tx_status: data.txStatus || "pending",
    created_at: now,
  }]);
}
