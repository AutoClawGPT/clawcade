import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, walletAddress, image } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name are required" },
      { status: 400 }
    );
  }

  // Check if email exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Return existing user's auth token
    return NextResponse.json({
      userId: existing.id,
      authToken: existing.authToken,
      message: "Welcome back! Your authToken is the same.",
    });
  }

  // Generate unique auth token
  const authToken = `auth_${uuid().replace(/-/g, "")}`;

  const [user] = await db.insert(users).values({
    id: uuid(),
    email,
    name,
    image: image || null,
    walletAddress: walletAddress || null,
    publicKey: null,
    authToken,
    role: "user",
    level: 1,
    xp: 0,
    totalScore: 0,
    totalGames: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestStreak: 0,
    tokensEarned: 0,
    encryptedKeys: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return NextResponse.json({
    userId: user.id,
    authToken: user.authToken,
    email: user.email,
    name: user.name,
    message: "Registration successful! Save your authToken securely — it's your API key.",
    warning: "Your authToken is shown only once. Store it safely.",
  });
}
