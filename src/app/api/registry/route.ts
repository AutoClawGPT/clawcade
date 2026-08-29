import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users, agentReputation, rewards } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";
import { listAgents } from "@/lib/clawpump";

// Compute reputation score from live activity
function computeReputation(
  stats: {
    totalGames?: number | null;
    totalScore?: number | null;
    rewards?: number | null;
    twitterVerified?: boolean | null;
  }
): { score: number; tier: string } {
  let score = 0;
  score += (stats.totalGames || 0) * 2;
  score += Math.floor((stats.totalScore || 0) / 1000);
  score += (stats.rewards || 0) * 10;
  if (stats.twitterVerified) score += 25;
  const tier =
    score >= 1000 ? "platinum" : score >= 500 ? "gold" : score >= 100 ? "silver" : score >= 10 ? "bronze" : "unrated";
  return { score, tier };
}

// GET /api/registry — list agents with reputation + verified status
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);

    const platformAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        publicKey: agents.publicKey,
        avatarUrl: agents.avatarUrl,
        image: agents.image,
        totalGames: agents.totalGames,
        totalScore: agents.totalScore,
        tokensEarned: agents.tokensEarned,
        trustTier: agents.trustTier,
        reputationScore: agents.reputationScore,
        twitterVerified: agents.twitterVerified,
        twitterHandle: agents.twitterHandle,
        clawpumpAgentId: agents.clawpumpAgentId,
        createdAt: agents.createdAt,
        owner: users.name,
      })
      .from(agents)
      .leftJoin(users, sql`${agents.userId} = ${users.id}`)
      .orderBy(desc(agents.reputationScore), desc(agents.totalScore))
      .limit(100);

    let clawpumpAgents: unknown[] = [];
    if (user) {
      const key = getClawpumpKey(user);
      if (key) {
        try {
          const cp = await listAgents(key, { fresh: true });
          clawpumpAgents = cp.map((a) => ({
            ...a,
            reputationScore: a.reputationScore || 0,
            trustTier: a.trustTier || "unrated",
          }));
        } catch {
          clawpumpAgents = [];
        }
      }
    }

    return NextResponse.json({ platforms: platformAgents, clawpump: clawpumpAgents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/registry — register / update reputation
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, agentId } = body;

    if (action === "register") {
      // Register the user's reputation entry + sync trust tier onto their agents
      let existing = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.userId, user.id))
        .limit(1);

      if (!existing.length) {
        await db.insert(agentReputation).values({
          userId: user.id,
          trustTier: "unrated",
          reputationScore: 0,
        });
        existing = await db
          .select()
          .from(agentReputation)
          .where(eq(agentReputation.userId, user.id))
          .limit(1);
      }

      const rep = existing[0];
      return NextResponse.json({
        success: true,
        reputation: {
          trustTier: rep.trustTier,
          reputationScore: rep.reputationScore,
          totalTrades: rep.totalTrades,
          totalLaunches: rep.totalLaunches,
          totalBounties: rep.totalBounties,
          completedBounties: rep.completedBounties,
          twitterVerified: rep.twitterVerified,
        },
      });
    }

    if (action === "update") {
      const { trades, launches, bounties, twitterVerified } = body;

      // Upsert reputation row for this user
      let existing = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.userId, user.id))
        .limit(1);

      let rep;
      if (existing.length) {
        // Count rewards from DB for base score
        const [rewardCount] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(rewards)
          .where(eq(rewards.userId, user.id));
        const [agentStats] = await db
          .select({
            games: sql<number>`coalesce(sum(${agents.totalGames}),0)::int`,
            score: sql<number>`coalesce(sum(${agents.totalScore}),0)::int`,
          })
          .from(agents)
          .where(eq(agents.userId, user.id));

        const newScore = computeReputation({
          totalGames: (agentStats?.games ?? 0) + (trades || 0) * 5,
          totalScore: agentStats?.score ?? 0,
          rewards: rewardCount?.n ?? 0,
          twitterVerified: twitterVerified ?? existing[0].twitterVerified,
        });
        rep = {
          ...existing[0],
          totalTrades: (existing[0].totalTrades || 0) + (trades || 0),
          totalLaunches: (existing[0].totalLaunches || 0) + (launches || 0),
          totalBounties: (existing[0].totalBounties || 0) + (bounties || 0),
          twitterVerified: twitterVerified ?? existing[0].twitterVerified,
          reputationScore: newScore.score,
          trustTier: newScore.tier,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        };
        await db
          .update(agentReputation)
          .set({
            totalTrades: rep.totalTrades,
            totalLaunches: rep.totalLaunches,
            totalBounties: rep.totalBounties,
            twitterVerified: rep.twitterVerified,
            reputationScore: rep.reputationScore,
            trustTier: rep.trustTier,
            lastActivityAt: rep.lastActivityAt,
            updatedAt: rep.updatedAt,
          })
          .where(eq(agentReputation.id, rep.id));
      } else {
        const newScore = computeReputation({
          totalGames: trades ? trades * 5 : 0,
          twitterVerified: twitterVerified ?? false,
        });
        const [inserted] = await db
          .insert(agentReputation)
          .values({
            userId: user.id,
            totalTrades: trades || 0,
            totalLaunches: launches || 0,
            totalBounties: bounties || 0,
            twitterVerified: twitterVerified ?? false,
            reputationScore: newScore.score,
            trustTier: newScore.tier,
            lastActivityAt: new Date(),
          })
          .returning();
        rep = inserted;
      }

      // Sync tier+score onto all the user's agents
      await db
        .update(agents)
        .set({
          trustTier: rep.trustTier,
          reputationScore: rep.reputationScore,
          twitterVerified: rep.twitterVerified || undefined,
        })
        .where(eq(agents.userId, user.id));

      return NextResponse.json({
        success: true,
        reputation: {
          trustTier: rep.trustTier,
          reputationScore: rep.reputationScore,
          totalTrades: rep.totalTrades,
          totalLaunches: rep.totalLaunches,
          totalBounties: rep.totalBounties,
          completedBounties: rep.completedBounties,
          twitterVerified: rep.twitterVerified,
        },
      });
    }

    if (action === "agent" && agentId) {
      // Link a ClawPump agent to a platform agent / update its reputation fields
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
        .limit(1);
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      const { clawpumpAgentId, avatarUrl, trustTier, reputationScore, twitterVerified, twitterHandle } = body;
      const updates: Record<string, unknown> = {};
      if (clawpumpAgentId !== undefined) updates.clawpumpAgentId = clawpumpAgentId;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (trustTier !== undefined) updates.trustTier = trustTier;
      if (reputationScore !== undefined) updates.reputationScore = reputationScore;
      if (twitterVerified !== undefined) updates.twitterVerified = twitterVerified;
      if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle;
      updates.updatedAt = new Date();
      await db.update(agents).set(updates).where(eq(agents.id, agent.id));
      return NextResponse.json({ success: true, agentId: agent.id, updated: updates });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
