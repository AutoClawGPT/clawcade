import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptKey } from "@/lib/crypto";

async function getUserFromAuth(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authToken, token))
    .limit(1);
  return user || null;
}

// GET /api/user/settings
export async function GET(req: NextRequest) {
  const user = await getUserFromAuth(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = user.encryptedKeys as Record<string, string>;
  const connectedKeys = Object.keys(keys).filter(k => k !== "");

  return NextResponse.json({
    settings: {
      name: user.name,
      email: user.email,
      image: user.image,
      walletAddress: user.walletAddress,
    },
    connectedKeys: connectedKeys.map(k => ({
      name: k,
      connected: true,
      masked: "••••••••",
    })),
  });
}

// PUT /api/user/settings — Update settings and connect API keys
export async function PUT(req: NextRequest) {
  const user = await getUserFromAuth(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, image, walletAddress, clawpumpApiKey, settings } = body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (image) updates.image = image;
  if (walletAddress) updates.walletAddress = walletAddress;

  // Encrypt and store API keys
  const currentKeys = (user.encryptedKeys as Record<string, string>) || {};
  const newKeys = { ...currentKeys };

  if (clawpumpApiKey) {
    newKeys.clawpumpApiKey = encryptKey(clawpumpApiKey);
  }

  if (Object.keys(newKeys).length > 0) {
    updates.encryptedKeys = newKeys;
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id));

  return NextResponse.json({
    success: true,
    message: "Settings updated successfully",
    connectedKeys: Object.keys(newKeys),
  });
}
