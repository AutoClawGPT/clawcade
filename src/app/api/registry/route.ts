import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { getUserFromAuth, getClawpumpKey } from "@/lib/route-auth";
import { listAgents, getWalletSummaries } from "@/lib/clawpump";

// GET /api/registry — list registered CLAWCADE agents + live ClawPump agents
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);

    // Platform agents from the DB (game-playing agents)
    const platformAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        status: agents.status,
        publicKey: agents.publicKey,
        totalGames: agents.totalGames,
        totalScore: agents.totalScore,
        tokensEarned: agents.tokensEarned,
        createdAt: agents.createdAt,
        owner: users.name,
      })
      .from(agents)
      .leftJoin(users, sql`${agents.userId} = ${users.id}`)
      .orderBy(desc(agents.totalScore))
      .limit(100);

    // Live ClawPump agents if the user is signed in with a key
    let clawpumpAgents: unknown[] = [];
    if (user) {
      const key = getClawpumpKey(user);
      if (key) {
        try {
          clawpumpAgents = await listAgents(key, { fresh: true });
        } catch {
          clawpumpAgents = [];
        }
      }
    }

    return NextResponse.json({ platforms: platformAgents, clawpump: clawpumpAgents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
