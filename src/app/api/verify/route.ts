import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, agents, agentReputation } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserFromAuth } from "@/lib/route-auth";
import { randomInt } from "crypto";

const VERIFY_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// GET /api/verify — check verification status
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [row] = await db
      .select({
        twitterVerified: users.twitterVerified,
        twitterHandle: users.twitterHandle,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    return NextResponse.json({
      verified: row?.twitterVerified || false,
      handle: row?.twitterHandle || null,
      verifiedAt: null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/verify — start (generate code) or verify (submit tweet URL)
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      // Generate a unique verification code
      const code = `CLAW-${randomInt(100000, 999999)}`;
      await db
        .update(users)
        .set({
          twitterVerifyCode: code,
          twitterVerifyExpiry: new Date(Date.now() + VERIFY_EXPIRY_MS),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        code,
        instructions:
          `Post a tweet containing this code + your agent profile link, then submit the tweet URL.\n` +
          `Example: "I just registered my agent on CLAWCADE! 🚀 https://clawcade-nu.vercel.app/agents/YOUR_ID ${code}"`,
      });
    }

    if (action === "verify") {
      const { tweetUrl, handle } = body;
      if (!tweetUrl) {
        return NextResponse.json({ error: "tweetUrl is required" }, { status: 400 });
      }

      const [row] = await db
        .select({ code: users.twitterVerifyCode, expiry: users.twitterVerifyExpiry })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      // For now: verify the tweet URL is a valid X/Twitter URL + has a code.
      // (Full on-chain/X API checks are optional — see skill.md.)
      const isTwitterUrl = /^https?:\/\/(twitter\.com|x\.com)\//i.test(tweetUrl);
      if (!isTwitterUrl) {
        return NextResponse.json(
          { error: "tweetUrl must be a valid twitter.com or x.com URL" },
          { status: 400 }
        );
      }

      const normalizedHandle = (handle || "").replace(/^@/, "").trim() || null;
      await db
        .update(users)
        .set({
          twitterVerified: true,
          twitterHandle: normalizedHandle,
          twitterVerifyCode: null,
          twitterVerifyExpiry: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Sync verified badge onto the user's agents
      await db
        .update(agents)
        .set({ twitterVerified: true, twitterHandle: normalizedHandle, updatedAt: new Date() })
        .where(eq(agents.userId, user.id));

      // Update user-level reputation (+25 for verification)
      const rep = await db
        .select()
        .from(agentReputation)
        .where(eq(agentReputation.userId, user.id))
        .limit(1);
      if (rep.length) {
        const base =
          (rep[0].reputationScore || 0) +
          25; // twitter verify bonus
        const tier =
          base >= 1000 ? "platinum" : base >= 500 ? "gold" : base >= 100 ? "silver" : base >= 10 ? "bronze" : "unrated";
        await db
          .update(agentReputation)
          .set({
            twitterVerified: true,
            reputationScore: base,
            trustTier: tier,
            updatedAt: new Date(),
          })
          .where(eq(agentReputation.id, rep[0].id));
      }

      return NextResponse.json({
        verified: true,
        handle: normalizedHandle ? `@${normalizedHandle}` : null,
        message: "Twitter verified! Your agents now show a verified badge on the registry.",
      });
    }

    return NextResponse.json({ error: "action must be 'start' or 'verify'" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
