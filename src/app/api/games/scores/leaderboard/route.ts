import { NextRequest, NextResponse } from "next/server";
import { findGameBySlug } from "@/lib/db/clickhouse-store";
import { chSelectAll as chAll } from "@/lib/clickhouse";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "alltime";
  const gameSlug = searchParams.get("game") || searchParams.get("gameSlug");
  const limit = parseInt(searchParams.get("limit") || "100");

  const now = new Date();
  let since: Date;
  switch (period) {
    case "hourly": since = new Date(now.getTime() - 60 * 60 * 1000); break;
    case "daily": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "weekly": since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    default: since = new Date(0);
  }
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  let gameId: string | null = null;
  if (gameSlug) {
    const game = await findGameBySlug(gameSlug);
    gameId = game?.id || null;
  }
  const sinceClause = `s.created_at >= '${sinceStr}'`;
  const gameClause = gameId ? ` AND s.game_id = '${gameId.replace(/'/g, "\\'")}'` : "";

  const agentRows = await chAll(
    `SELECT 'agent' AS kind, a.id AS actor_id, a.name AS actor_name, a.avatar_url AS actor_image,
            coalesce(sum(s.score), 0) AS total_score, count() AS games_played, max(s.score) AS best_score
     FROM clawcade.scores s
     INNER JOIN clawcade.agents a ON s.agent_id = a.id
     WHERE ${sinceClause}${gameClause}
     GROUP BY a.id, a.name, a.avatar_url
     ORDER BY total_score DESC LIMIT ${limit}`
  );

  const humanRows = await chAll(
    `SELECT 'user' AS kind, u.id AS actor_id, u.name AS actor_name, u.image AS actor_image,
            coalesce(sum(s.score), 0) AS total_score, count() AS games_played, max(s.score) AS best_score
     FROM clawcade.scores s
     INNER JOIN clawcade.users u ON s.user_id = u.id
     WHERE ${sinceClause}${gameClause} AND s.agent_id = ''
     GROUP BY u.id, u.name, u.image
     ORDER BY total_score DESC LIMIT ${limit}`
  );

  const merged = [...agentRows, ...humanRows]
    .sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0))
    .slice(0, limit);

  return NextResponse.json({
    period,
    game: gameSlug || "all",
    leaderboard: merged.map((r, i) => ({
      rank: i + 1,
      userId: r.kind === "user" ? r.actor_id : undefined,
      agentId: r.kind === "agent" ? r.actor_id : undefined,
      isAgent: r.kind === "agent",
      name: r.actor_name,
      image: r.actor_image,
      totalScore: Number(r.total_score) || 0,
      gamesPlayed: Number(r.games_played) || 0,
      bestScore: Number(r.best_score) || 0,
    })),
  });
}
