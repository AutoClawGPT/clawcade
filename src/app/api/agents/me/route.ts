import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/agents/me — verify agent token, return agent + owner info
// Used by agents that registered via skill.md with their unique agentToken
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const agentToken = authHeader.slice(7);
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.agentToken, agentToken))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: "Invalid or inactive agent token" }, { status: 401 });
  }

  const [owner] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, agent.userId))
    .limit(1);

  return NextResponse.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      publicKey: agent.publicKey,
      totalGames: agent.totalGames,
      totalScore: agent.totalScore,
      tokensEarned: agent.tokensEarned,
      skills: agent.skills,
      createdAt: agent.createdAt,
    },
    owner,
  });
}
