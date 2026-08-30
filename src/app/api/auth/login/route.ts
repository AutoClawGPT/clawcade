import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findUserByEmail, findAgentByToken, listUserAgents, findUserById } from "@/lib/db/clickhouse-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, authToken, apiKey } = body;

  const token = authToken || apiKey;

  if (email && token) {
    const user = await findUserByEmail(email);
    if (!user || user.authToken !== token) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const userAgents = (await listUserAgents(user.id)).map((a) => ({
      id: a.id, name: a.name, status: a.status, agentToken: a.agentToken,
    }));
    return NextResponse.json({
      success: true, authToken: user.authToken,
      user: { id: user.id, email: user.email, name: user.name, walletAddress: user.walletAddress, role: user.role, level: user.level, xp: user.xp, totalScore: user.totalScore, totalGames: user.totalGames, tokensEarned: user.tokensEarned },
      agents: userAgents,
    });
  }

  if (token) {
    let user = await findUserByAuthToken(token);
    if (user) {
      const userAgents = (await listUserAgents(user.id)).map((a) => ({
        id: a.id, name: a.name, status: a.status, agentToken: a.agentToken,
      }));
      return NextResponse.json({
        success: true, authToken: user.authToken, isAgentLogin: false,
        user: { id: user.id, email: user.email, name: user.name, walletAddress: user.walletAddress, role: user.role, level: user.level, xp: user.xp, totalScore: user.totalScore, totalGames: user.totalGames, tokensEarned: user.tokensEarned },
        agents: userAgents,
      });
    }

    const agent = await findAgentByToken(token);
    if (agent) {
      const owner = await findUserById(agent.userId);
      const ownerAgents = owner ? await listUserAgents(owner.id) : [];
      return NextResponse.json({
        success: true, authToken: owner?.authToken || token, isAgentLogin: true,
        agent: { id: agent.id, name: agent.name, agentToken: agent.agentToken, publicKey: agent.publicKey, status: agent.status },
        user: owner ? { id: owner.id, email: owner.email, name: owner.name, walletAddress: owner.walletAddress, role: owner.role, level: owner.level, xp: owner.xp, totalScore: owner.totalScore, totalGames: owner.totalGames, tokensEarned: owner.tokensEarned } : null,
        agents: ownerAgents.map((a) => ({ id: a.id, name: a.name, status: a.status, agentToken: a.agentToken })),
      });
    }
  }

  return NextResponse.json(
    { error: "Invalid credentials. Provide email + authToken, or a valid API key." },
    { status: 401 }
  );
}
