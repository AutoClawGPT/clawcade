import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, findAgentByToken, findAgentById, updateAgentRows } from "@/lib/db/clickhouse-store";
import { decryptKey } from "@/lib/crypto";

async function resolveActor(req: NextRequest): Promise<{ user?: any; agent?: any } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const user = await findUserByAuthToken(token);
  if (user) return { user };
  const agent = await findAgentByToken(token);
  if (agent) return { agent };
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const agent = await findAgentById(id);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const isOwner = actor.user ? actor.user.id === agent.userId : actor.agent?.id === agent.id;
    if (!isOwner) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    if (!agent.secretKeyEncrypted) {
      return NextResponse.json({ error: "No wallet secret stored for this agent" }, { status: 400 });
    }

    // One-time guard: if already revealed, block repeat access
    if (agent.walletKeyRevealed) {
      return NextResponse.json({
        success: true,
        wallet: {
          address: agent.publicKey,
          privateKey: null,
          warning: "Private key was already revealed. Contact support to recover.",
          revealed: true,
        },
      });
    }

    let secretKey: string;
    try {
      secretKey = decryptKey(agent.secretKeyEncrypted);
    } catch {
      return NextResponse.json({ error: "Could not decrypt wallet secret" }, { status: 500 });
    }

    // Mark as revealed
    await updateAgentRows(agent.id, { walletKeyRevealed: 1 });

    return NextResponse.json({
      success: true,
      wallet: {
        address: agent.publicKey,
        privateKey: secretKey,
        warning: "Save this private key NOW. It is shown only once. ClawCade cannot recover it — the encrypted copy is only readable by you.",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
