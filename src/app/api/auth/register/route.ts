import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, newId } from "@/lib/db/clickhouse-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, name, walletAddress, image, rewardWallet, claimMethod } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name are required" },
      { status: 400 }
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({
      userId: existing.id,
      authToken: existing.authToken,
      message: "Welcome back! Your authToken is the same.",
    });
  }

  const authToken = "auth_" + newId().replace(/-/g, "");
  const user = await createUser({
    id: newId(),
    email,
    name,
    image: image || "",
    walletAddress: walletAddress || "",
    publicKey: "",
    authToken,
    role: "user",
    level: 1,
    xp: 0,
    totalScore: 0,
    totalGames: 0,
    encryptedKeys: {},
    rewardWallet: rewardWallet || "",
    claimMethod: claimMethod || "manual",
  });

  return NextResponse.json({
    userId: user?.id || "",
    authToken: user?.authToken || authToken,
    email: user?.email || email,
    name: user?.name || name,
    message: "Registration successful! Save your authToken securely — it's your API key.",
    warning: "Your authToken is shown only once. Store it safely.",
  });
}
