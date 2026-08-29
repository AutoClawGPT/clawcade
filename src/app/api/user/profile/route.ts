import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, agents, rewards, scores } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { encryptKey, decryptKey } from "@/lib/crypto";
import { listAgents } from "@/lib/clawpump";

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

// Postgres sum()/count() return strings — coerce to numbers
function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

  // Get user's total score (sum/count come back as strings from PG)
  const [stats] = await db
    .select({
      totalScore: sql<number>`coalesce(sum(${scores.score}), 0)`,
      gamesPlayed: sql<number>`count(*)`,
    })
    .from(scores)
    .where(eq(scores.userId, user.id));

  // Check if user has connected a ClawPump key
  const encryptedKeys = (user.encryptedKeys as Record<string, string>) || {};
  const hasClawpumpKey = !!encryptedKeys.clawpumpApiKey;

  let clawpumpStatus: { hasKey: boolean; agents: number; error?: string } = {
    hasKey: hasClawpumpKey,
    agents: 0,
  };
  if (hasClawpumpKey) {
    try {
      const key = decryptKey(encryptedKeys.clawpumpApiKey);
      const agents = await listAgents(key, { fresh: true });
      clawpumpStatus.agents = agents.length;
    } catch {
      clawpumpStatus.hasKey = hasClawpumpKey;
      clawpumpStatus.error = "ClawPump key could not be verified";
    }
  }

  const totalScore = toNum(stats?.totalScore);
  const totalGames = toNum(stats?.gamesPlayed);

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
      totalScore,
      totalGames,
      tokensEarned: user.tokensEarned,
      createdAt: user.createdAt,
    },
    agents: userAgents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      publicKey: a.publicKey,
      agentToken: a.agentToken,
      status: a.status,
      totalGames: a.totalGames,
      totalScore: a.totalScore,
      tokensEarned: a.tokensEarned,
      skills: a.skills,
      avatarUrl: a.avatarUrl,
      image: a.image,
      trustTier: a.trustTier,
      reputationScore: a.reputationScore,
      twitterVerified: a.twitterVerified,
      twitterHandle: a.twitterHandle,
      clawpumpAgentId: a.clawpumpAgentId,
    })),
    recentRewards,
    clawpump: clawpumpStatus,
  });
}
