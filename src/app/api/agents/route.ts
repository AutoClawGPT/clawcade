import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/agents — List all active agents (public)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const allAgents = await db
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
      createdAt: agents.createdAt,
      ownerName: users.name,
    })
    .from(agents)
    .leftJoin(users, eq(agents.userId, users.id))
    .where(eq(agents.status, "active"))
    .orderBy(desc(agents.totalScore))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    agents: allAgents,
    total: allAgents.length,
  });
}
