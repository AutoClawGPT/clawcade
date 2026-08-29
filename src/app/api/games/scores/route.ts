import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scores, users, games } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { createHash } from "crypto";

async function getUserFromAuth(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authToken, token))
    .limit(1);
  return user || null;
}

// POST /api/games/scores — Submit a game score
export async function POST(req: NextRequest) {
  const user = await getUserFromAuth(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { gameSlug, gameId, score, duration, seed, moves, proof, metadata } = body;

  const slug = gameSlug || gameId;
  if (!slug || typeof score !== "number" || score < 0) {
    return NextResponse.json({ error: "Invalid score data. Provide gameSlug and score." }, { status: 400 });
  }

  // Look up game
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.slug, slug))
    .limit(1);

  if (!game) {
    return NextResponse.json({ error: "Game not found: " + slug }, { status: 404 });
  }

  // Anti-cheat: basic validation
  if (score > (game.maxScore || 1000000) * 1.1) {
    return NextResponse.json({ error: "Score exceeds maximum" }, { status: 400 });
  }

  // Generate proof hash
  const proofHash = createHash("sha256")
    .update(score + ":" + (seed || "0") + ":" + user.id)
    .digest("hex");

  // Save score
  const [saved] = await db.insert(scores).values({
    id: uuid(),
    userId: user.id,
    gameId: game.id,
    agentId: null,
    score,
    duration: duration || null,
    proof: proofHash,
    verified: true,
    metadata: metadata || {},
    createdAt: new Date(),
  }).returning();

  // Update user stats
  const newTotalScore = (Number(user.totalScore) || 0) + score;
  const newTotalGames = (Number(user.totalGames) || 0) + 1;
  const newXp = (Number(user.xp) || 0) + Math.floor(score / 10);

  await db
    .update(users)
    .set({
      totalScore: newTotalScore,
      totalGames: newTotalGames,
      xp: newXp,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return NextResponse.json({
    success: true,
    scoreId: saved.id,
    score: saved.score,
    xpEarned: Math.floor(score / 10),
    proof: proofHash,
    totalScore: newTotalScore,
    totalGames: newTotalGames,
  });
}

// GET /api/games/scores — Get user's scores
export async function GET(req: NextRequest) {
  const user = await getUserFromAuth(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userScores = await db
    .select({
      id: scores.id,
      gameId: scores.gameId,
      score: scores.score,
      duration: scores.duration,
      createdAt: scores.createdAt,
      gameName: games.name,
      gameSlug: games.slug,
    })
    .from(scores)
    .leftJoin(games, eq(scores.gameId, games.id))
    .where(eq(scores.userId, user.id))
    .orderBy(scores.createdAt)
    .limit(100);

  return NextResponse.json({ scores: userScores });
}
