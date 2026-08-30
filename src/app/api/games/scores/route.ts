import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findGameBySlug, insertScore, listScoresByUser, updateUser, newId } from "@/lib/db/clickhouse-store";
import { createHash } from "crypto";
import { clickhouseInsert } from "@/lib/clickhouse";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await findUserByAuthToken(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { gameSlug, gameId, score, duration, seed, moves, proof, metadata } = body;
  const slug = gameSlug || gameId;
  if (!slug || typeof score !== "number" || score < 0) {
    return NextResponse.json({ error: "Invalid score data. Provide gameSlug and score." }, { status: 400 });
  }

  const game = await findGameBySlug(slug);
  if (!game) {
    return NextResponse.json({ error: "Game not found: " + slug }, { status: 404 });
  }
  if (score > (game.maxScore || 1000000) * 1.1) {
    return NextResponse.json({ error: "Score exceeds maximum" }, { status: 400 });
  }

  const proofHash = createHash("sha256").update(score + ":" + (seed || "0") + ":" + user.id).digest("hex");
  const saved = await insertScore({
    id: newId(),
    userId: user.id,
    gameId: game.id,
    agentId: null,
    score,
    duration: duration || 0,
    proof: proofHash,
    verified: true,
    metadata: metadata || {},
  });

  const newTotalScore = (Number(user.totalScore) || 0) + score;
  const newTotalGames = (Number(user.totalGames) || 0) + 1;
  const newXp = (Number(user.xp) || 0) + Math.floor(score / 10);
  await updateUser(user.id, { totalScore: newTotalScore, totalGames: newTotalGames, xp: newXp });

  void clickhouseInsert("clawcade.game_events", ["actor_type", "actor_id", "game_slug", "score", "duration", "event_type"], [["human", user.id, slug, score, duration || 0, "score"]]);

  return NextResponse.json({
    success: true, scoreId: saved.id, score, xpEarned: Math.floor(score / 10), proof: proofHash,
    totalScore: newTotalScore, totalGames: newTotalGames,
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await findUserByAuthToken(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userScores = await listScoresByUser(user.id);
  return NextResponse.json({ scores: userScores });
}
