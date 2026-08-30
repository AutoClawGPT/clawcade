import { NextRequest, NextResponse } from "next/server";
import { getTopPlayers, getUserRewards, getTotalRewardsDistributed, TOKEN_INFO, REWARD_CAPS, REWARD_CONFIG } from "@/lib/rewards";
import { getDistributionInfo } from "@/lib/distribution";
import { getPlatformConfig } from "@/lib/db/clickhouse-store";

// GET /api/rewards — Leaderboard + reward info + live distribution state
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") as "hourly" | "daily" | "weekly" | "alltime" || "daily";
  const limit = parseInt(searchParams.get("limit") || "10");
  const userId = searchParams.get("userId");

  const topPlayers = await getTopPlayers(period, limit);
  const totalDistributed = await getTotalRewardsDistributed();
  const distInfo = await getDistributionInfo();
  const platformMint = await getPlatformConfig("platform_token_mint");

  let userRewards = null;
  if (userId) userRewards = await getUserRewards(userId);

  return NextResponse.json({
    period,
    tokens: TOKEN_INFO,
    rewardCaps: REWARD_CAPS,
    schedule: {
      hourly: { token: "PLATFORM", note: "Top players every hour — live once platform token mint is set" },
      daily: { token: "CLAW", note: "1x per day — score→points→CLAW, capped 100" },
      weekly: { token: "ANSEM", note: "1x per week — score→points→ANSEM, capped 100" },
    },
    conversion: {
      rule: "100,000 score = 10,000 points; 10,000 points = 100 CLAW / 10 ANSEM / 1,000 PLATFORM",
      scoreToPoints: "score ÷ 10",
      pointsToTokens: "CLAW: points ÷ 100 · ANSEM: points ÷ 1000 · PLATFORM: points × 0.1",
      caps: REWARD_CAPS,
    },
    platformToken: {
      symbol: "CLAWCADE",
      name: "ClawCade Platform Token",
      address: platformMint || null,
      chain: platformMint ? "Solana (pump.fun)" : "TBD",
      live: !!platformMint,
      note: platformMint
        ? "Platform token is LIVE — hourly drops distribute to top players automatically."
        : "Our own platform token launch is coming. Set the mint in platform config and hourly drops light up automatically.",
    },
    distribution: distInfo,
    topPlayers: topPlayers.map((p, i) => ({
      rank: i + 1,
      userId: p.userId,
      name: p.userName,
      image: p.userImage,
      wallet: p.walletAddress,
      score: p.totalScore,
      gamesPlayed: p.gamesPlayed,
    })),
    totalDistributed,
    userRewards,
  });
}
