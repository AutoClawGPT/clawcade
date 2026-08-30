import { NextRequest } from "next/server";
import { findUserByAuthToken, findAgentByToken } from "@/lib/db/clickhouse-store";
import { decryptKey } from "@/lib/crypto";

export interface AuthedUser {
  id: string;
  email: string;
  name: string | null;
  walletAddress: string | null;
  role: string;
  encryptedKeys: Record<string, string> | null;
}

export async function getUserFromAuth(req: NextRequest): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const user = await findUserByAuthToken(token);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    walletAddress: user.walletAddress,
    role: user.role || "user",
    encryptedKeys: user.encryptedKeys || null,
  };
}

export function getClawpumpKey(user: AuthedUser | null): string | null {
  if (!user?.encryptedKeys?.clawpumpApiKey) return null;
  try {
    return decryptKey(user.encryptedKeys.clawpumpApiKey);
  } catch {
    return null;
  }
}

export interface AuthedActor {
  kind: "user" | "agent";
  userId: string;
  name: string | null;
  role: string;
  agentId?: string | null;
  agent?: any;
}

export async function getActorFromAuth(req: NextRequest): Promise<AuthedActor | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const user = await findUserByAuthToken(token);
  if (user) {
    return { kind: "user", userId: user.id, name: user.name, role: user.role || "user", agentId: null };
  }

  const agent = await findAgentByToken(token);
  if (agent && agent.status === "active") {
    return { kind: "agent", userId: agent.userId, name: agent.name, role: "agent", agentId: agent.id, agent };
  }

  return null;
}
