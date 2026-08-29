import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptKey, decryptKey } from "@/lib/crypto";

async function resolveActor(req: NextRequest): Promise<{ user?: any; agent?: any } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db.select().from(users).where(eq(users.authToken, token)).limit(1);
  if (user) return { user };
  const [agent] = await db.select().from(agents).where(eq(agents.agentToken, token)).limit(1);
  if (agent) return { agent };
  return null;
}

// POST /api/agents/:id/wallet — reveal the agent's generated SOL wallet ONCE.
// The agent's Ed25519 keypair IS a valid Solana wallet: publicKey = wallet address,
// secretKey (64 bytes) = private key. The private key is encrypted at rest and
// only revealed to the owner one time.
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { id } = await ctx.params;
    const actor = await resolveActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const isOwner = actor.user ? actor.user.id === agent.userId : actor.agent?.id === agent.id;
    if (!isOwner) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    if (!agent.secretKeyEncrypted) {
      return NextResponse.json({ error: "No wallet secret stored for this agent" }, { status: 400 });
    }

    let secretKey: string;
    try {
      secretKey = decryptKey(agent.secretKeyEncrypted);
    } catch {
      return NextResponse.json({ error: "Could not decrypt wallet secret" }, { status: 500 });
    }

    // The agent's publicKey is the SOL wallet address (base58 of the 32-byte pubkey).
    return NextResponse.json({
      success: true,
      wallet: {
        address: agent.publicKey,
        privateKey: secretKey,
        warning:
          "Save this private key NOW. It is shown only once. ClawCade cannot recover it — the encrypted copy is only readable by you.",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
