import { NextRequest, NextResponse } from "next/server";
import { getTopPlayers, getUserRewards, getTotalRewardsDistributed, TOKEN_INFO, REWARD_CAPS } from "@/lib/rewards";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/rewards — Get leaderboard + reward info
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") as "hourly" | "daily" | "weekly" | "alltime" || "daily";
  const limit = parseInt(searchParams.get("limit") || "10");
  const userId = searchParams.get("userId");

  const [topPlayers, totalDistributed] = await Promise.all([
    getTopPlayers(period, limit),
    getTotalRewardsDistributed(),
  ]);

  let userRewards = null;
  if (userId) {
    userRewards = await getUserRewards(userId);
  }

  return NextResponse.json({
    period,
    tokens: TOKEN_INFO,
    rewardCaps: REWARD_CAPS,
    platformToken: {
      symbol: "CLAWCADE-PLATFORM",
      name: "ClawCade Platform Token",
      address: null,
      chain: "TBD",
      live: false,
      note: "Our own platform token launch is coming. This block will light up with the real mint address and drop schedule.",
    },
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
