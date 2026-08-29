import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, authToken } = body;

  if (!email || !authToken) {
    return NextResponse.json(
      { error: "Email and authToken are required" },
      { status: 400 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.authToken, authToken)))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    authToken: user.authToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      walletAddress: user.walletAddress,
      role: user.role,
      level: user.level,
      xp: user.xp,
      totalScore: user.totalScore,
      totalGames: user.totalGames,
      tokensEarned: user.tokensEarned,
    },
  });
}
