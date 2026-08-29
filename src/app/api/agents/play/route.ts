import { NextRequest, NextResponse } from "next/server";
import { verifyAgentToken } from "@/lib/agent";
import { db } from "@/lib/db";
import { scores, games, agents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuid } from "uuid";

// POST /api/agents/play — Agent submits a game score
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const agentToken = authHeader.slice(7);
  const agent = await verifyAgentToken(agentToken);
  
  if (!agent) {
    return NextResponse.json(
      { error: "Invalid or inactive agent token" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { gameSlug, score, duration, proof, metadata } = body;

  if (!gameSlug || typeof score !== "number" || score < 0) {
    return NextResponse.json(
      { error: "Invalid score data" },
      { status: 400 }
    );
  }

  // Look up game
  const [game] = await db
    .select()
    .from(games)
    .where(eq(games.slug, gameSlug))
    .limit(1);

  if (!game) {
    return NextResponse.json(
      { error: "Game not found" },
      { status: 404 }
    );
  }

  // Anti-cheat: validate score is reasonable
  if (score > game.maxScore * 1.1) {
    return NextResponse.json(
      { error: "Score exceeds maximum possible value" },
      { status: 400 }
    );
  }

  // Save score
  const [savedScore] = await db.insert(scores).values({
    id: uuid(),
    userId: agent.userId,
    gameId: game.id,
    agentId: agent.id,
    score,
    duration: duration || null,
    proof: proof || null,
    verified: true, // Agent scores auto-verified via token
    metadata: metadata || {},
    createdAt: new Date(),
  }).returning();

  // Update agent stats
  await db
    .update(agents)
    .set({
      totalGames: agent.totalGames + 1,
      totalScore: agent.totalScore + score,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, agent.id));

  // Update user stats
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, agent.userId))
    .limit(1);

  if (user) {
    await db
      .update(users)
      .set({
        totalGames: user.totalGames + 1,
        totalScore: user.totalScore + score,
        updatedAt: new Date(),
      })
      .where(eq(users.id, agent.userId));
  }

  return NextResponse.json({
    success: true,
    scoreId: savedScore.id,
    score: savedScore.score,
    xpEarned: Math.floor(score / 10),
    message: `Score ${score} recorded for agent ${agent.name}`,
  });
}

// GET /api/agents/play — Get agent's game history
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const agentToken = authHeader.slice(7);
  const agent = await verifyAgentToken(agentToken);
  
  if (!agent) {
    return NextResponse.json(
      { error: "Invalid or inactive agent token" },
      { status: 401 }
    );
  }

  const agentScores = await db
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
    .where(eq(scores.agentId, agent.id))
    .orderBy(scores.createdAt)
    .limit(100);

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      publicKey: agent.publicKey,
      totalGames: agent.totalGames,
      totalScore: agent.totalScore,
    },
    scores: agentScores,
  });
}
