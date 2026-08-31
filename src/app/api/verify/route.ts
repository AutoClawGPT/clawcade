import { NextRequest, NextResponse } from "next/server";
import { getUserFromAuth } from "@/lib/route-auth";
import { findUserById, updateUser, updateAgentRows } from "@/lib/db/clickhouse-store";
import { chSelectAll, chUpdate } from "@/lib/clickhouse";
import { randomInt } from "crypto";

const VERIFY_EXPIRY_MS = 15 * 60 * 1000;

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const full = await findUserById(user.id);
    return NextResponse.json({
      verified: full?.twitterVerified || false,
      handle: full?.twitterHandle || null,
      verifiedAt: null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      const code = "CLAW-" + randomInt(100000, 999999);
      await updateUser(user.id, { twitterVerifyCode: code, twitterVerifyExpiry: new Date(Date.now() + VERIFY_EXPIRY_MS) });
      return NextResponse.json({
        code,
        instructions:
          "User posts a tweet (using their own agent ID + profile link) with this code, then submit the tweet URL.\n" +
          `Example: "I just registered my agent on @CLAWCADEAGENT! 🚀 https://clawcade-nu.vercel.app/agents/AGENT_ID ${code}"`,
      });
    }

    if (action === "verify") {
      const { tweetUrl, handle } = body;
      if (!tweetUrl) return NextResponse.json({ error: "tweetUrl is required" }, { status: 400 });

      const full = await findUserById(user.id);
      const isTwitterUrl = /^https?:\/\/(twitter\.com|x\.com)\//i.test(tweetUrl);
      if (!isTwitterUrl) return NextResponse.json({ error: "tweetUrl must be a valid twitter.com or x.com URL" }, { status: 400 });

      const normalizedHandle = (handle || "").replace(/^@/, "").trim() || "";
      await updateUser(user.id, {
        twitterVerified: true,
        twitterHandle: normalizedHandle,
        twitterVerifyCode: "",
        twitterVerifyExpiry: null,
      });

      const agentRows = await chSelectAll("SELECT id FROM clawcade.agents WHERE user_id = " + Q(user.id));
      for (const a of agentRows) {
        await chUpdate("clawcade.agents", { twitter_verified: 1, twitter_handle: normalizedHandle }, "id = " + Q(String(a.id)));
      }

      const rep = await chSelectAll("SELECT id, reputation_score FROM clawcade.agent_reputation WHERE user_id = " + Q(user.id) + " LIMIT 1");
      if (rep.length) {
        const base = Number(rep[0].reputation_score || 0) + 25;
        const tier = base >= 1000 ? "platinum" : base >= 500 ? "gold" : base >= 100 ? "silver" : base >= 10 ? "bronze" : "unrated";
        await chUpdate("clawcade.agent_reputation", { twitter_verified: 1, reputation_score: base, trust_tier: tier }, "id = " + Q(String(rep[0].id)));
      }

      return NextResponse.json({
        verified: true,
        handle: normalizedHandle ? "@" + normalizedHandle : null,
        message: "Twitter verified! Your agents now show a verified badge on the registry.",
      });
    }

    return NextResponse.json({ error: "action must be 'start' or 'verify'" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
