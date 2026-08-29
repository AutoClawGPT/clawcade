import { NextRequest, NextResponse } from "next/server";
import { createAutomation, listAutomations } from "@/lib/clawpump";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";

// GET /api/clawpump/automations?agentId=...
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
    if (!agentId) {
      return NextResponse.json(
        { error: "agentId query parameter is required" },
        { status: 400 }
      );
    }
    const automations = await listAutomations(agentId, key);
    return NextResponse.json({ success: true, automations });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/clawpump/automations — create a price trigger or scheduled action
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const { agentId, name, trigger, action, triggerOnce } = body;
    if (!agentId || !name || !trigger || !action) {
      return NextResponse.json(
        { error: "agentId, name, trigger, and action are required" },
        { status: 400 }
      );
    }
    const automation = await createAutomation(
      { agentId, name, trigger, action, triggerOnce },
      key
    );
    return NextResponse.json({ success: true, automation }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
