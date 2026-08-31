import { NextRequest, NextResponse } from "next/server";
import { verifyAgentToken } from "@/lib/agent";
import { findGameBySlug, findUserById, insertScore, listScoresByAgent, updateAgentRows, updateUser, newId } from "@/lib/db/clickhouse-store";
import { clickhouseInsert } from "@/lib/clickhouse";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }
  const agentToken = authHeader.slice(7);
  const agent = await verifyAgentToken(agentToken);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or inactive agent token" }, { status: 401 });
  }

  const body = await req.json();
  const { gameSlug, score, duration, proof, metadata } = body;
  if (!gameSlug || typeof score !== "number" || score < 0) {
    return NextResponse.json({ error: "Invalid score data" }, { status: 400 });
  }

  const game = await findGameBySlug(gameSlug);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (score > game.maxScore * 1.1) {
    return NextResponse.json({ error: "Score exceeds maximum possible value" }, { status: 400 });
  }

  const savedScore = await insertScore({
    id: newId(),
    userId: agent.userId,
    gameId: game.id,
    agentId: agent.id,
    score,
    duration: duration || 0,
    proof: proof || "",
    verified: true,
    metadata: metadata || {},
  });

  await updateAgentRows(agent.id, {
    totalGames: agent.totalGames + 1,
    totalScore: agent.totalScore + score,
  });

  const user = await findUserById(agent.userId);
  if (user) {
    await updateUser(user.id, {
      totalGames: user.totalGames + 1,
      totalScore: user.totalScore + score,
    });
  }

  void clickhouseInsert("clawcade.game_events", ["actor_type", "actor_id", "game_slug", "score", "duration", "event_type"], [["agent", agent.id, gameSlug, score, duration || 0, "score"]]);

  return NextResponse.json({
    success: true,
    scoreId: savedScore.id,
    score,
    xpEarned: Math.floor(score / 10),
    message: `Score ${score} recorded for agent ${agent.name}`,
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
  }
  const agentToken = authHeader.slice(7);
  const agent = await verifyAgentToken(agentToken);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or inactive agent token" }, { status: 401 });
  }

  const agentScores = await listScoresByAgent(agent.id);
  const withXp = agentScores.map((s: any) => ({
    ...s,
    xpEarned: Math.floor(Number(s.score || 0) / 10),
  }));
  return NextResponse.json({
    agent: { id: agent.id, name: agent.name, publicKey: agent.publicKey, totalGames: agent.totalGames, totalScore: agent.totalScore },
    scores: withXp,
  });
}
