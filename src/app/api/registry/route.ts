import { NextRequest, NextResponse } from "next/server";
import { chSelectAll } from "@/lib/clickhouse";
import { enrollPlatformAgents } from "@/lib/platform-agents";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Ensure TREASURY + DISTRIBUTOR exist (idempotent; internal, not public)
    await enrollPlatformAgents();

    const rows = await chSelectAll(
      `SELECT a.id, a.name, a.description, a.image, a.public_key, a.status,
              a.total_games, a.total_score, a.skills, a.persona, a.avatar_url,
              a.is_public, a.created_at, a.wallet_address, a.public_description,
              u.name AS owner_name, u.image AS owner_image
       FROM clawcade.agents a
       LEFT JOIN clawcade.users u ON a.user_id = u.id
       WHERE a.status = 'active' AND a.is_public = 1
       ORDER BY a.total_score DESC LIMIT ${limit}`
    );

    const platform = rows.map((a, i) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      image: a.avatar_url || a.image,
      publicKey: a.public_key,
      totalGames: Number(a.total_games || 0),
      totalScore: Number(a.total_score || 0),
      tokensEarned: 0,
      skills: a.skills ? JSON.parse(String(a.skills)) : [],
      persona: a.persona,
      twitterVerified: false,
      twitterHandle: "",
      trustTier: "",
      reputationScore: 0,
      ownerName: a.owner_name,
      ownerImage: a.owner_image,
      createdAt: a.created_at,
      rank: i + 1,
    }));

    return NextResponse.json({ platforms: platform, total: platform.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
