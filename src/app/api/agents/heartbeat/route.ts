import { NextRequest, NextResponse } from "next/server";
import { findAgentByToken, updateAgentRows } from "@/lib/db/clickhouse-store";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const agent = await findAgentByToken(token);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or inactive agent token" }, { status: 401 });
    }

    await updateAgentRows(agent.id, { status: "active" });

    return NextResponse.json({
      success: true,
      agent: { id: agent.id, name: agent.name, status: "active" },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
