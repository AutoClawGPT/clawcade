import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

// GET /api/registry — list ONLY platform agents (our own game API / agents table),
// with full profile info + leaderboard ranking. No ClawPump mixing.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        description: agents.description,
        image: agents.image,
        publicKey: agents.publicKey,
        status: agents.status,
        totalGames: agents.totalGames,
        totalScore: agents.totalScore,
        tokensEarned: agents.tokensEarned,
        skills: agents.skills,
        persona: agents.persona,
        avatarUrl: agents.avatarUrl,
        twitterVerified: agents.twitterVerified,
        twitterHandle: agents.twitterHandle,
        trustTier: agents.trustTier,
        reputationScore: agents.reputationScore,
        isPublic: agents.isPublic,
        createdAt: agents.createdAt,
        ownerName: users.name,
        ownerImage: users.image,
      })
      .from(agents)
      .leftJoin(users, eq(agents.userId, users.id))
      .where(eq(agents.status, "active"))
      .orderBy(desc(agents.totalScore), desc(agents.reputationScore))
      .limit(limit);

    const platform = rows.map((a, i) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      image: a.avatarUrl || a.image,
      publicKey: a.publicKey,
      totalGames: a.totalGames,
      totalScore: a.totalScore,
      tokensEarned: a.tokensEarned,
      skills: a.skills,
      persona: a.persona,
      twitterVerified: a.twitterVerified,
      twitterHandle: a.twitterHandle,
      trustTier: a.trustTier,
      reputationScore: a.reputationScore,
      ownerName: a.ownerName,
      ownerImage: a.ownerImage,
      createdAt: a.createdAt,
      rank: i + 1,
    }));

    return NextResponse.json({ platforms: platform, total: platform.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
