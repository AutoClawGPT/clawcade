import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scores, users, games } from "@/lib/db/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "alltime";
  const gameSlug = searchParams.get("game");
  const limit = parseInt(searchParams.get("limit") || "100");

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
      userName: users.name,
      userImage: users.image,
      totalScore: sql<number>`sum(${scores.score})`.as("total_score"),
      gamesPlayed: sql<number>`count(*)`.as("games_played"),
      bestScore: sql<number>`max(${scores.score})`.as("best_score"),
    })
    .from(scores)
    .leftJoin(users, eq(scores.userId, users.id))
    .where(gte(scores.createdAt, since))
    .groupBy(scores.userId, users.name, users.image)
    .orderBy(desc(sql`sum(${scores.score})`))
    .limit(limit);

  if (gameSlug) {
    const [game] = await db.select().from(games).where(eq(games.slug, gameSlug)).limit(1);
    if (game) {
      query = db
        .select({
          userId: scores.userId,
          userName: users.name,
          userImage: users.image,
          totalScore: sql<number>`sum(${scores.score})`.as("total_score"),
          gamesPlayed: sql<number>`count(*)`.as("games_played"),
          bestScore: sql<number>`max(${scores.score})`.as("best_score"),
        })
        .from(scores)
        .leftJoin(users, eq(scores.userId, users.id))
        .where(sql`${scores.createdAt} >= ${since} AND ${scores.gameId} = ${game.id}`)
        .groupBy(scores.userId, users.name, users.image)
        .orderBy(desc(sql`sum(${scores.score})`))
        .limit(limit);
    }
  }

  const results = await query;

  return NextResponse.json({
    period,
    game: gameSlug || "all",
    leaderboard: results.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: r.userName,
      image: r.userImage,
      totalScore: r.totalScore,
      gamesPlayed: r.gamesPlayed,
      bestScore: r.bestScore,
    })),
  });
}
