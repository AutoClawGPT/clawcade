import { NextRequest, NextResponse } from "next/server";
import { listAgents } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// GET /api/clawpump/wallets — live balances for the user's ClawPump agents
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in first." }, { status: 401 });
    }
    const key = getClawpumpKey(user);
    if (!key) {
      return NextResponse.json(
        { error: "Connect your ClawPump API key in Settings first." },
        { status: 400 }
      );
    }

    const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

    async function onChainSol(wallet: string): Promise<number | null> {
      if (!wallet) return null;
      try {
        const res = await fetch(SOLANA_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBalance",
            params: [wallet],
          }),
        });
        const json = await res.json();
        const lamports = json?.result?.value;
        if (typeof lamports !== "number") return null;
        return lamports / 1e9;
      } catch {
        return null;
      }
    }

    const agents = await listAgents(key, { fresh: true });
    const withBalances = [];

    for (const agent of agents) {
      const solBalance = agent.walletAddress ? await onChainSol(agent.walletAddress) : null;
      withBalances.push({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        walletAddress: agent.walletAddress,
        model: agent.model,
        skills: agent.skills,
        solBalance,
      });
    }

    return NextResponse.json({ success: true, agents: withBalances });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump wallets error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
