import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, agents } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, authToken, apiKey } = body;

  // Support three login modes:
  // 1. Email + authToken (existing human flow)
  // 2. apiKey only (token = authToken OR agentToken) — for SKILL.md-registered agents
  //    that only have their API key saved
  const token = authToken || apiKey;

  if (email && token) {
    // Mode 1: human login with email + token
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.authToken, token)))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const userAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        agentToken: agents.agentToken,
      })
      .from(agents)
      .where(eq(agents.userId, user.id));

    return NextResponse.json({
      success: true,
      authToken: user.authToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        role: user.role,
        level: user.level,
        xp: user.xp,
        totalScore: user.totalScore,
        totalGames: user.totalGames,
        tokensEarned: user.tokensEarned,
      },
      agents: userAgents,
    });
  }

  if (token) {
    // Mode 2/3: token-only login (authToken or agentToken)
    // First try as a human authToken
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.authToken, token))
      .limit(1);

    if (user) {
      const userAgents = await db
        .select({
          id: agents.id,
          name: agents.name,
          status: agents.status,
          agentToken: agents.agentToken,
        })
        .from(agents)
        .where(eq(agents.userId, user.id));

      return NextResponse.json({
        success: true,
        authToken: user.authToken,
        isAgentLogin: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          walletAddress: user.walletAddress,
          role: user.role,
          level: user.level,
          xp: user.xp,
          totalScore: user.totalScore,
          totalGames: user.totalGames,
          tokensEarned: user.tokensEarned,
        },
        agents: userAgents,
      });
    }

    // Then try as an agentToken
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.agentToken, token))
      .limit(1);

    if (agent) {
      const [owner] = await db
        .select()
        .from(users)
        .where(eq(users.id, agent.userId))
        .limit(1);

      return NextResponse.json({
        success: true,
        authToken: owner?.authToken || token,
        isAgentLogin: true,
        agent: {
          id: agent.id,
          name: agent.name,
          agentToken: agent.agentToken,
          publicKey: agent.publicKey,
          status: agent.status,
        },
        user: owner
          ? {
              id: owner.id,
              email: owner.email,
              name: owner.name,
              walletAddress: owner.walletAddress,
              role: owner.role,
              level: owner.level,
              xp: owner.xp,
              totalScore: owner.totalScore,
              totalGames: owner.totalGames,
              tokensEarned: owner.tokensEarned,
            }
          : null,
        agents: owner
          ? await db
              .select({
                id: agents.id,
                name: agents.name,
                status: agents.status,
                agentToken: agents.agentToken,
              })
              .from(agents)
              .where(eq(agents.userId, owner.id))
          : [],
      });
    }
  }

  return NextResponse.json(
    { error: "Invalid credentials. Provide email + authToken, or a valid API key." },
    { status: 401 }
  );
}
