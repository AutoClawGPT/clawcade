import { NextRequest, NextResponse } from "next/server";
import { findUserByAuthToken, listUserAgents, newId } from "@/lib/db/clickhouse-store";
import { chSelectFirst, chSelectAll } from "@/lib/clickhouse";
import { decryptKey } from "@/lib/crypto";
import { listAgents } from "@/lib/clawpump";

const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer "))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await findUserByAuthToken(authHeader.slice(7));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgents = await listUserAgents(user.id);

  const recentRewards = await chSelectAll(
    "SELECT * FROM clawcade.rewards WHERE user_id = " + Q(user.id) + " ORDER BY created_at DESC LIMIT 10"
  );

  const statsRow = await chSelectFirst(
    "SELECT coalesce(sum(score), 0) AS ts, count() AS gp FROM clawcade.scores WHERE user_id = " + Q(user.id)
  );

  const encryptedKeys = user.encryptedKeys || {};
  const hasClawpumpKey = !!encryptedKeys.clawpumpApiKey;
  let clawpumpStatus: { hasKey: boolean; agents: number; error?: string } = { hasKey: hasClawpumpKey, agents: 0 };
  if (hasClawpumpKey) {
    try {
      const key = decryptKey(encryptedKeys.clawpumpApiKey);
      const agents = await listAgents(key, { fresh: true });
      clawpumpStatus.agents = agents.length;
    } catch {
      clawpumpStatus.hasKey = hasClawpumpKey;
      clawpumpStatus.error = "ClawPump key could not be verified";
    }
  }

  const totalScore = toNum(statsRow?.ts);
  const totalGames = toNum(statsRow?.gp);

  return NextResponse.json({
    user: {
      id: user.id, email: user.email, name: user.name, image: user.image,
      walletAddress: user.walletAddress, role: user.role, level: user.level, xp: user.xp,
      totalScore, totalGames, tokensEarned: user.tokensEarned,
      rewardWallet: user.rewardWallet, claimMethod: user.claimMethod, createdAt: user.createdAt,
    },
    agents: userAgents.map((a: any) => ({
      id: a.id, name: a.name, description: a.description, publicKey: a.publicKey,
      status: a.status, totalGames: a.totalGames, totalScore: a.totalScore,
      tokensEarned: 0, skills: a.skills, avatarUrl: a.avatarUrl, image: a.image,
      trustTier: a.trustTier, reputationScore: a.reputationScore, twitterVerified: a.twitterVerified,
      twitterHandle: a.twitterHandle, clawpumpAgentId: a.clawpumpAgentId, rewardWallet: a.rewardWallet, claimMethod: a.claimMethod,
    })),
    recentRewards,
    clawpump: clawpumpStatus,
  });
}
