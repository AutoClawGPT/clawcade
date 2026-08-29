import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, agents, rewards, scores } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

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

// GET /api/user/profile
export async function GET(req: NextRequest) {
  const user = await getUserFromAuth(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's agents
  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, user.id));

  // Get user's recent rewards
  const recentRewards = await db
    .select()
    .from(rewards)
    .where(eq(rewards.userId, user.id))
    .orderBy(desc(rewards.createdAt))
    .limit(10);

  // Get user's total score
  const [stats] = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${scores.score}), 0)`,
      gamesPlayed: sql<number>`count(*)`,
    })
    .from(scores)
    .where(eq(scores.userId, user.id));

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      walletAddress: user.walletAddress,
      role: user.role,
      level: user.level,
      xp: user.xp,
      totalScore: stats?.totalScore || 0,
      totalGames: stats?.gamesPlayed || 0,
      tokensEarned: user.tokensEarned,
      createdAt: user.createdAt,
    },
    agents: userAgents.map(a => ({
      id: a.id,
      name: a.name,
      publicKey: a.publicKey,
      status: a.status,
      totalGames: a.totalGames,
      totalScore: a.totalScore,
    })),
    recentRewards,
  });
}
