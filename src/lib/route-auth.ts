import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decryptKey } from "@/lib/crypto";

export interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
  walletAddress: string | null;
  encryptedKeys: Record<string, string> | null;
}

/**
 * Resolve the authenticated ClawCade user from the Bearer authToken header.
 */
export async function getUserFromAuth(
  req: NextRequest
): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.authToken, token))
    .limit(1);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    walletAddress: user.walletAddress,
    encryptedKeys: (user.encryptedKeys as Record<string, string>) || null,
  };
}

/**
 * Get the user's connected ClawPump API key (decrypted).
 * Returns null if not connected.
 */
export function getClawpumpKey(user: AuthedUser | null): string | null {
  if (!user?.encryptedKeys?.clawpumpApiKey) return null;
  try {
    return decryptKey(user.encryptedKeys.clawpumpApiKey);
  } catch {
    return null;
  }
}
