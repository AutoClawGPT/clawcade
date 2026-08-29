import { NextRequest, NextResponse } from "next/server";
import { launchTokenGasless, launchPonsToken, listAgents } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// POST /api/clawpump/launch
// mode: "gasless" | "pons"
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in first." }, { status: 401 });
    }

    const key = getClawpumpKey(user);
    if (!key) {
      return NextResponse.json(
        {
          error:
            "Connect your own ClawPump API key in Settings first, then launch tokens.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { mode } = body;

    // Verify the agent belongs to the user's key (ownership check)
    if (body.agentId) {
      try {
        const owned = await listAgents(key, { fresh: true });
        const ownedIds = (owned || []).map((a) => a.id);
        if (!ownedIds.includes(body.agentId)) {
          return NextResponse.json(
            {
              error:
                "This API key does not own the specified agent. Pick one of your agents from the dropdown.",
              ownedAgents: ownedIds,
            },
            { status: 403 }
          );
        }
      } catch {
        // Let the upstream call decide if ownership check fails
      }
    }

    if (mode === "pons") {
      const { agentId, name, symbol, description, logoUrl, payoutWallet } = body;
      if (!agentId || !name || !symbol || !payoutWallet) {
        return NextResponse.json(
          { error: "agentId, name, symbol, and payoutWallet are required for PONS" },
          { status: 400 }
        );
      }
      const result = await launchPonsToken(
        {
          agentId,
          name,
          symbol: String(symbol).toUpperCase().slice(0, 12),
          description: description || `${name}, launched on Robinhood Chain via ClawPump.`,
          logoUrl: logoUrl || "https://clawpump.tech/claw-token.webp",
          payoutWallet,
        },
        key
      );
      return NextResponse.json({ success: true, result }, { status: 201 });
    }

    // Default: gasless pump.fun launch
    const { symbol, description, name, imageUrl, twitter, website, initialBuySol, devBuy } = body;
    if (!symbol || !description) {
      return NextResponse.json(
        { error: "symbol and description are required" },
        { status: 400 }
      );
    }
    const result = await launchTokenGasless(
      {
        symbol: String(symbol).toUpperCase().slice(0, 10),
        description,
        name: name || undefined,
        agentId: body.agentId || undefined,
        imageUrl: imageUrl || undefined,
        twitter: twitter || undefined,
        website: website || undefined,
        initialBuySol: initialBuySol || undefined,
        devBuy: devBuy || undefined,
      },
      key
    );
    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump launch error:", msg);
    const status = msg.includes("403") ? 403 : msg.includes("401") ? 401 : msg.includes("400") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
