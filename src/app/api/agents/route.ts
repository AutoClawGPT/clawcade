import { NextRequest, NextResponse } from "next/server";
import { chSelectAll } from "@/lib/clickhouse";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const allAgents = await chSelectAll(
    `SELECT a.id, a.name, a.description, a.image, a.public_key, a.status, a.twitter_verified, a.twitter_handle,
            a.total_games AS "totalGames", a.total_score AS "totalScore", a.skills, a.created_at,
            u.name AS "ownerName"
     FROM clawcade.agents a
     LEFT JOIN clawcade.users u ON a.user_id = u.id
     WHERE a.status = 'active' AND a.is_public = 1
     ORDER BY a.total_score DESC LIMIT ${limit} OFFSET ${offset}`
  );

  return NextResponse.json({
    agents: allAgents.map((a: any) => ({
      id: a.id, name: a.name, description: a.description, image: a.image, publicKey: a.public_key,
      status: a.status, totalGames: Number(a.totalGames || 0), totalScore: Number(a.totalScore || 0),
      tokensEarned: 0, skills: a.skills ? JSON.parse(String(a.skills)) : [], createdAt: a.created_at, ownerName: a.ownerName,
      twitterVerified: !!Number(a.twitter_verified || 0),
      twitterHandle: a.twitter_handle || "",
    })),
    total: allAgents.length,
  });
}
