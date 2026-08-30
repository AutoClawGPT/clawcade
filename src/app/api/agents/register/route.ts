import { NextRequest, NextResponse } from "next/server";
import { registerAgent } from "@/lib/agent";
import { findUserByAuthToken } from "@/lib/db/clickhouse-store";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid Authorization header. Provide your authToken." }, { status: 401 });
  }
  const authToken = authHeader.slice(7);
  const user = await findUserByAuthToken(authToken);
  if (!user) {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }
  const body = await req.json();
  const { name, description, image, publicKey, secretKey, skills, clawpumpAgentId, clawpumpWalletAddress, persona, avatarUrl, rewardWallet, claimMethod } = body;
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const result = await registerAgent(user.id, { name, description, image, publicKey, secretKey, skills, clawpumpAgentId, clawpumpWalletAddress, persona, avatarUrl, rewardWallet, claimMethod });
    return NextResponse.json({ success: true, agent: result, message: "Agent registered successfully. Save your agentToken securely.", warning: "Your agentToken is shown only once. Store it safely." });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Registration failed" }, { status: 400 });
  }
}
