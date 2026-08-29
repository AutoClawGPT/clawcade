import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scores, users, agents, games } from "@/lib/db/schema";
import { eq, desc, sql, gte, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "alltime";
  const gameSlug = searchParams.get("game") || searchParams.get("gameSlug");
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

  let gameId: string | null = null;
  if (gameSlug) {
    const [game] = await db.select({ id: games.id }).from(games).where(eq(games.slug, gameSlug)).limit(1);
    gameId = game?.id || null;
  }

  // Agent scores (agents submitted via agentToken)
  const agentBase = db
    .select({
      key: sql<string>`'agent:' || ${agents.id}::text`.as("key"),
      agentId: agents.id,
      actorName: agents.name,
      actorImage: agents.avatarUrl,
      totalScore: sql<number>`coalesce(sum(${scores.score}),0)`.as("total_score"),
      gamesPlayed: sql<number>`count(*)`.as("games_played"),
      bestScore: sql<number>`max(${scores.score})`.as("best_score"),
    })
    .from(scores)
    .innerJoin(agents, eq(scores.agentId, agents.id))
    .where(gameId ? and(gte(scores.createdAt, since), eq(scores.gameId, gameId)) : gte(scores.createdAt, since))
    .groupBy(agents.id, agents.name, agents.avatarUrl);

  const agentRows = await agentBase.orderBy(desc(sql`sum(${scores.score})`)).limit(limit);

  // Human scores (no agent)
  const humanBase = db
    .select({
      key: sql<string>`'user:' || ${users.id}::text`.as("key"),
      userId: users.id,
      actorName: users.name,
      actorImage: users.image,
      totalScore: sql<number>`coalesce(sum(${scores.score}),0)`.as("total_score"),
      gamesPlayed: sql<number>`count(*)`.as("games_played"),
      bestScore: sql<number>`max(${scores.score})`.as("best_score"),
    })
    .from(scores)
    .innerJoin(users, eq(scores.userId, users.id))
    .where(gameId
      ? and(gte(scores.createdAt, since), eq(scores.gameId, gameId), sql`${scores.agentId} is null`)
      : and(gte(scores.createdAt, since), sql`${scores.agentId} is null`))
    .groupBy(users.id, users.name, users.image);

  const humanRows = await humanBase.orderBy(desc(sql`sum(${scores.score})`)).limit(limit);

  const merged = [...agentRows, ...humanRows]
    .sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0))
    .slice(0, limit);

  return NextResponse.json({
    period,
    game: gameSlug || "all",
    leaderboard: merged.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      agentId: r.agentId,
      isAgent: !!r.agentId,
      name: r.actorName,
      image: r.actorImage,
      totalScore: Number(r.totalScore) || 0,
      gamesPlayed: Number(r.gamesPlayed) || 0,
      bestScore: Number(r.bestScore) || 0,
    })),
  });
}
