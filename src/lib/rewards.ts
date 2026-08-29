import { db } from "@/lib/db";
import { rewards, users, scores, agents, treasureDrops, platformConfig } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Reward distribution configuration
// Hard caps: single reward never exceeds 1000; CLAW <= 100 per reward, ANSEM <= 100 per reward.
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

// Reward distribution configuration
export const REWARD_CONFIG = {
  HOURLY: {
    // Top 3 players each hour get CLAW tokens
    topN: 3,
    amounts: [100, 50, 25], // CLAW tokens for 1st, 2nd, 3rd
    token: "CLAW",
    intervalMs: 60 * 60 * 1000, // 1 hour
  },
  DAILY: {
    // Top 10 players each day get CLAW tokens
    topN: 10,
    amounts: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
    token: "CLAW",
    intervalMs: 24 * 60 * 60 * 1000,
  },
  WEEKLY: {
    // ALL active players get ANSEM tokens based on score
    topN: null, // all active
    baseAmount: 20, // minimum ANSEM for being active
    bonusPerScore: 0.002, // bonus ANSEM per score point
    token: "ANSEM",
    intervalMs: 7 * 24 * 60 * 60 * 1000,
  },
};

// Get top players for a time period
export async function getTopPlayers(
  period: "hourly" | "daily" | "weekly" | "alltime",
  limit: number = 10,
  gameId?: string
) {
  const now = new Date();
  let since: Date;

  switch (period) {
    case "hourly":
      since = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case "daily":
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "weekly":
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      since = new Date(0);
  }

  let query = db
    .select({
      userId: scores.userId,
      totalScore: sql<number>`sum(${scores.score})`.as("total_score"),
      gamesPlayed: sql<number>`count(*)`.as("games_played"),
      userName: users.name,
      userImage: users.image,
      walletAddress: users.walletAddress,
    })
    .from(scores)
    .leftJoin(users, eq(scores.userId, users.id))
    .where(gte(scores.createdAt, since))
    .groupBy(scores.userId, users.name, users.image, users.walletAddress)
    .orderBy(desc(sql`sum(${scores.score})`))
    .limit(limit);

  if (gameId) {
    query = db
      .select({
        userId: scores.userId,
        totalScore: sql<number>`sum(${scores.score})`.as("total_score"),
        gamesPlayed: sql<number>`count(*)`.as("games_played"),
        userName: users.name,
        userImage: users.image,
        walletAddress: users.walletAddress,
      })
      .from(scores)
      .leftJoin(users, eq(scores.userId, users.id))
      .where(and(gte(scores.createdAt, since), eq(scores.gameId, gameId)))
      .groupBy(scores.userId, users.name, users.image, users.walletAddress)
      .orderBy(desc(sql`sum(${scores.score})`))
      .limit(limit);
  }

  return query;
}

// Distribute hourly rewards (called by cron)
export async function distributeHourlyRewards() {
  const config = REWARD_CONFIG.HOURLY;
  const topPlayers = await getTopPlayers("hourly", config.topN);

  const results = [];

  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const amount = clampReward(config.amounts[i], config.token);

    if (!player.walletAddress) continue;

    const [reward] = await db.insert(rewards).values({
      id: uuid(),
      userId: player.userId,
      type: "hourly",
      amount,
      token: config.token,
      status: "pending",
      rank: i + 1,
      period: `hourly_${new Date().toISOString().slice(0, 13)}`,
      createdAt: new Date(),
    }).returning();

    results.push({
      rank: i + 1,
      userId: player.userId,
      userName: player.userName,
      amount,
      token: config.token,
      rewardId: reward.id,
    });
  }

  return results;
}

// Distribute daily rewards (called by cron)
export async function distributeDailyRewards() {
  const config = REWARD_CONFIG.DAILY;
  const topPlayers = await getTopPlayers("daily", config.topN);

  const results = [];

  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const amount = clampReward(config.amounts[i], config.token);

    if (!player.walletAddress) continue;

    const [reward] = await db.insert(rewards).values({
      id: uuid(),
      userId: player.userId,
      type: "daily",
      amount,
      token: config.token,
      status: "pending",
      rank: i + 1,
      period: `daily_${new Date().toISOString().slice(0, 10)}`,
      createdAt: new Date(),
    }).returning();

    results.push({
      rank: i + 1,
      userId: player.userId,
      userName: player.userName,
      amount,
      token: config.token,
    });
  }

  return results;
}

// Distribute weekly rewards to ALL active players
export async function distributeWeeklyRewards() {
  const config = REWARD_CONFIG.WEEKLY;
  const allActive = await getTopPlayers("weekly", 1000);

  const results = [];

  for (const player of allActive) {
    if (!player.walletAddress) continue;

    const amount = clampReward(
      Math.floor(config.baseAmount + player.totalScore * config.bonusPerScore),
      config.token
    );

    const [reward] = await db.insert(rewards).values({
      id: uuid(),
      userId: player.userId,
      type: "weekly",
      amount,
      token: config.token,
      status: "pending",
      rank: 0,
      period: `weekly_${new Date().toISOString().slice(0, 10)}`,
      createdAt: new Date(),
    }).returning();

    results.push({
      userId: player.userId,
      userName: player.userName,
      amount,
      token: config.token,
    });
  }

  return results;
}

// Get user reward history
export async function getUserRewards(userId: string, limit: number = 50) {
  return db
    .select()
    .from(rewards)
    .where(eq(rewards.userId, userId))
    .orderBy(desc(rewards.createdAt))
    .limit(limit);
}

// Get total rewards distributed
export async function getTotalRewardsDistributed() {
  const result = await db
    .select({
      token: rewards.token,
      total: sql<number>`sum(${rewards.amount})`.as("total"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(rewards)
    .groupBy(rewards.token);

  return result;
}

// ──────────────────────────────────────────────
// TOKEN DISPLAY INFO (live addresses + platform placeholder)
// ──────────────────────────────────────────────
export const TOKEN_INFO = {
  CLAW: {
    symbol: "CLAW",
    name: "ClawCade Token",
    address: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump",
    chain: "Solana (pump.fun)",
    live: true,
  },
  ANSEM: {
    symbol: "ANSEM",
    name: "Ansem Token",
    address: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
    chain: "Solana (pump.fun)",
    live: true,
  },
};
