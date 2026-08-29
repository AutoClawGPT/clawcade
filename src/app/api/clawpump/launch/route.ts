import { NextRequest, NextResponse } from "next/server";
import { launchTokenGasless, launchTokenSelfFunded, launchPonsToken, listAgents, getPonsLaunches } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// Serve token images from our own domain so ClawPump's image validation
// (which blocks abuse-prone hosts like postimg.cc) accepts them.
function proxyImageUrl(url: string | undefined, origin: string): string | undefined {
  if (!url) return undefined;
  if (!/^https?:\/\//i.test(url)) return url; // already a path (ClawPump avatar) — leave as-is
  const encoded = Buffer.from(url).toString("base64url");
  return `${origin}/api/image-proxy?u=${encoded}`;
}

// POST /api/clawpump/launch
// mode: "gasless" | "pons" | "selffunded"
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
          action: "connect_key",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { mode } = body;

    // Validate mode
    if (!["gasless", "pons", "selffunded"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be 'gasless', 'pons', or 'selffunded'" },
        { status: 400 }
      );
    }

    // Verify the agent belongs to the user's key (ownership check)
    let ownedAgent: { name?: string; walletAddress?: string } | null = null;
    if (body.agentId) {
      try {
        const owned = await listAgents(key, { fresh: true });
        const ownedAgents = owned || [];
        ownedAgent = ownedAgents.find((a) => a.id === body.agentId) || null;
        if (!ownedAgent) {
          return NextResponse.json(
            {
              error:
                "This API key does not own the specified agent. Pick one of your agents from the dropdown (loaded from your connected ClawPump key).",
              ownedAgents: ownedAgents.map((a) => a.id),
            },
            { status: 403 }
          );
        }
      } catch {
        // Let the upstream call decide if ownership check fails
      }
    }

    const origin = req.nextUrl.origin;

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
          logoUrl: logoUrl ? proxyImageUrl(logoUrl, origin) : "https://clawpump.tech/claw-token.webp",
          payoutWallet,
        },
        key
      );
      return NextResponse.json({ success: true, result }, { status: 201 });
    }

    if (mode === "selffunded") {
      const { agentId, name, symbol, description, imageUrl, network, initialBuySol, devBuy } = body;
      if (!agentId || !name || !symbol) {
        return NextResponse.json(
          { error: "agentId, name, and symbol are required for a self-funded launch" },
          { status: 400 }
        );
      }
      if ((description || "").trim().length < 20) {
        return NextResponse.json(
          { error: "description must be at least 20 characters for self-funded launches" },
          { status: 400 }
        );
      }
      const proxiedImage = proxyImageUrl(imageUrl, origin);
      const result = await launchTokenSelfFunded(
        {
          agentId,
          agentName: ownedAgent?.name || undefined,
          walletAddress: ownedAgent?.walletAddress || undefined,
          name,
          symbol: String(symbol).toUpperCase().slice(0, 12),
          description,
          imageUrl: proxiedImage,
          image_url: proxiedImage,
          network: network || "solana",
          initialBuySol: initialBuySol !== undefined ? Number(initialBuySol) : undefined,
          devBuy: devBuy !== undefined ? String(devBuy) : undefined,
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
    const proxiedImage = proxyImageUrl(imageUrl, origin);
    const result = await launchTokenGasless(
      {
        symbol: String(symbol).toUpperCase().slice(0, 10),
        description,
        name: name || undefined,
        agentId: body.agentId || undefined,
        imageUrl: proxiedImage,
        image_url: proxiedImage,
        network: "solana",
        twitter: twitter || undefined,
        website: website || undefined,
        initialBuySol: initialBuySol !== undefined ? Number(initialBuySol) : undefined,
        devBuy: devBuy !== undefined ? String(devBuy) : undefined,
      },
      key
    );
    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump launch error:", msg);
    let status = 500;

    // Classify errors from message
    if (msg.includes("401")) status = 401;
    else if (msg.includes("403")) status = 403;
    else if (msg.includes("404")) status = 404;
    else if (msg.includes("400") || msg.includes("422")) status = 400;
    else if (msg.includes("402") || msg.includes("Payment required")) status = 402;

    // Try to parse structured ClawPump error body
    const errBody = error as { body?: unknown };
    if (errBody?.body && typeof errBody.body === "object") {
      const body = errBody.body as Record<string, unknown>;
      const tokenLaunch = (body.token_launch || {}) as Record<string, unknown>;
      const text = `${body.error || ""} ${tokenLaunch.error || ""} ${(tokenLaunch.details as Record<string, unknown>)?.message || ""}`.toLowerCase();

      // Image rejection — use our proxy
      if (
        text.includes("image") &&
        (text.includes("blocked") || text.includes("abuse") || text.includes("generated") ||
         text.includes("upload") || text.includes("avatar"))
      ) {
        return NextResponse.json(
          {
            type: "image_rejected",
            error:
              "ClawPump rejected the token image: " +
              (body.error || "image host is blocked") +
              ". Use a real PNG/JPEG/WebP image from a normal host — our platform proxies images through its own domain automatically.",
          },
          { status: 400 }
        );
      }

      // Genuine funding guidance (402 needs_funding / Payment required)
      const isFunding =
        !!body.selfFunded ||
        body.code === "MAX_GASLESS_LAUNCHES_PER_USER_EXCEEDED" ||
        body.status === "needs_funding" ||
        body.nextStep === "self_funded" ||
        String(body.error || "").includes("Payment");
      if (isFunding) {
        return NextResponse.json(
          { type: "needs_funding", error: msg, ...body },
          { status: 402 }
        );
      }

      // Any other structured launch failure — surface the real message
      if (body.token_launch || body.code || body.nextStep) {
        return NextResponse.json(
          { type: "launch_failed", error: body.error || tokenLaunch.error || msg },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ type: "launch_failed", error: msg }, { status });
  }
}

// GET /api/clawpump/launch?agentId=... — fetch PONS launch history for an agent
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Sign in first." }, { status: 401 });
    }
    const agentId = req.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "agentId query parameter is required" }, { status: 400 });
    }
    const key = getClawpumpKey(user);
    if (!key) {
      return NextResponse.json({ launches: [] });
    }
    const result = await getPonsLaunches(agentId, key);
    return NextResponse.json({ launches: result?.launches || [] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
