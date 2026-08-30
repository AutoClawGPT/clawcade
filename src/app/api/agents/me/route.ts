import { NextRequest, NextResponse } from "next/server";
import { findAgentByToken, findUserById } from "@/lib/db/clickhouse-store";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }
  const agentToken = authHeader.slice(7);
  const agent = await findAgentByToken(agentToken);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or inactive agent token" }, { status: 401 });
  }
  const owner = await findUserById(agent.userId);
  return NextResponse.json({
    success: true,
    agent: {
      id: agent.id, name: agent.name, status: agent.status, publicKey: agent.publicKey,
      totalGames: agent.totalGames, totalScore: agent.totalScore, tokensEarned: 0,
      skills: agent.skills, createdAt: agent.createdAt,
    },
    owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
  });
}
