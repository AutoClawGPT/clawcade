import { NextRequest, NextResponse } from "next/server";
import { chatWithAgent, getAgentMessages } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// POST /api/clawpump/chat — send a message to a ClawPump agent using the user's own cpk_ key
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
            "Connect your own ClawPump API key in Settings first, then talk to your agents.",
        },
        { status: 400 }
      );
    }

    const { agentId, message } = await req.json();
    if (!agentId || !message?.trim()) {
      return NextResponse.json(
        { error: "agentId and message are required" },
        { status: 400 }
      );
    }

    const result = await chatWithAgent(agentId, message.trim(), key);
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump chat error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/clawpump/chat?agentId=...&limit=30 — fetch message history
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

    const agentId = req.nextUrl.searchParams.get("agentId");
    const limit = Number(req.nextUrl.searchParams.get("limit") || "30");
    if (!agentId) {
      return NextResponse.json(
        { error: "agentId query parameter is required" },
        { status: 400 }
      );
    }

    const messages = await getAgentMessages(agentId, key, Math.min(Math.max(limit, 1), 100));
    return NextResponse.json({ success: true, messages });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("ClawPump messages error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
