import { db } from "@/lib/db";
import { rewards, users, scores, agents, treasureDrops, platformConfig } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// Reward distribution configuration
export const REWARD_CONFIG = {
  HOURLY: {
    // Top 3 players each hour get CLAW tokens
    topN: 3,
    amounts: [1000, 500, 250], // CLAW tokens for 1st, 2nd, 3rd
    token: "CLAW",
    intervalMs: 60 * 60 * 1000, // 1 hour
  },
  DAILY: {
    // Top 10 players each day get CLAW tokens
    topN: 10,
    amounts: [5000, 3000, 2000, 1000, 1000, 500, 500, 500, 250, 250],
    token: "CLAW",
    intervalMs: 24 * 60 * 60 * 1000,
  },
  WEEKLY: {
    // ALL active players get ANSEM tokens based on score
    topN: null, // all active
    baseAmount: 100, // minimum ANSEM for being active
    bonusPerScore: 0.01, // bonus ANSEM per score point
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
    const amount = config.amounts[i];

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
    const amount = config.amounts[i];

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

    const amount = Math.floor(
      config.baseAmount + player.totalScore * config.bonusPerScore
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
