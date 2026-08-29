import { db } from "@/lib/db";
import { agents, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateApiKey, encryptKey, decryptKey } from "@/lib/crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { v4 as uuid } from "uuid";

function toBytes(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty key provided");

  // Reject EVM / 0x-prefixed addresses — they are NOT Ed25519 keys.
  if (/^0x/i.test(trimmed)) {
    throw new Error(
      "Invalid key format: 0x-prefixed EVM addresses are not Ed25519 keys. " +
      "publicKey must be a base58 or hex-encoded Ed25519 key."
    );
  }

  // Try base58 first (standard Solana/Ed25519 encoding)
  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 32 || decoded.length === 64) return decoded;
  } catch {}

  // Try plain hex (64 or 128 chars, no 0x prefix)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed) || /^[0-9a-fA-F]{128}$/.test(trimmed)) {
    return new Uint8Array(Buffer.from(trimmed, "hex"));
  }

  throw new Error(
    "Invalid key format: provide a base58-encoded Ed25519 key or a plain hex string (64 or 128 chars). " +
    "EVM/0x addresses are not accepted."
  );
}


/**
 * Validate a Solana wallet address (base58, 32-byte public key).
 * Used for reward wallets where rewards land. Rejects 0x EVM addresses.
 */
export function isValidSolanaWallet(wallet: string): boolean {
  if (!wallet) return false;
  const trimmed = wallet.trim();
  if (/^0x/i.test(trimmed)) return false;
  try {
    const decoded = bs58.decode(trimmed);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

export interface AgentRegistration {
  name: string;
  description?: string;
  image?: string;
  publicKey?: string;
  secretKey?: string;
  skills?: string[];
  clawpumpAgentId?: string;
  clawpumpWalletAddress?: string;
  persona?: string;
  avatarUrl?: string;
  rewardWallet?: string;
  claimMethod?: string;
}

export async function registerAgent(
  userId: string,
  data: AgentRegistration
) {
  let secretKeyB58 = data.secretKey || "";
  let publicKeyB58 = data.publicKey || "";

  // Auto-generate keypair if not provided
  if (!secretKeyB58) {
    const kp = nacl.sign.keyPair();
    secretKeyB58 = bs58.encode(kp.secretKey);
    publicKeyB58 = bs58.encode(kp.publicKey);
  }

  // Convert to bytes (supports hex or base58)
  const secretKeyBytes = toBytes(secretKeyB58);
  const publicKeyBytes = data.publicKey ? toBytes(data.publicKey) : secretKeyBytes.slice(32, 64);
  
  if (secretKeyBytes.length !== 64) {
    throw new Error("Invalid secret key length");
  }
  
  // Derive public key from secret key to verify
  const derivedPublic = secretKeyBytes.slice(32, 64);
  if (data.publicKey) {
    if (Buffer.compare(Buffer.from(derivedPublic), Buffer.from(publicKeyBytes)) !== 0) {
      throw new Error("Public key does not match secret key");
    }
  }

  // Always use base58 for storage
  const pubKeyStored = data.publicKey ? publicKeyB58 : bs58.encode(derivedPublic);

  // Validate reward wallet if provided (SOL, never 0x EVM)
  if (data.rewardWallet && !isValidSolanaWallet(data.rewardWallet)) {
    throw new Error(
      "Invalid rewardWallet: provide a Solana address (base58, 32-byte). EVM/0x addresses are not accepted."
    );
  }

  // Generate unique agent token
  const agentToken = `agent_${uuid().replace(/-/g, "")}`;
  
  // Encrypt secret key for storage
  const secretKeyEncrypted = encryptKey(secretKeyB58);
  
  // Create agent
  const [agent] = await db.insert(agents).values({
    id: uuid(),
    userId,
    name: data.name,
    description: data.description || null,
    image: data.image || null,
    agentToken,
    publicKey: pubKeyStored,
    secretKeyEncrypted,
    status: "active",
    totalGames: 0,
    totalScore: 0,
    tokensEarned: 0,
    skills: data.skills || [],
    clawpumpAgentId: data.clawpumpAgentId || null,
    clawpumpWalletAddress: data.clawpumpWalletAddress || null,
    persona: data.persona || null,
    avatarUrl: data.avatarUrl || null,
    rewardWallet: data.rewardWallet ? data.rewardWallet.trim() : null,
    claimMethod: data.claimMethod || "manual",
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  return {
    agentId: agent.id,
    agentToken,
    publicKey: pubKeyStored,
    name: agent.name,
  };
}

export async function verifyAgentToken(agentToken: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.agentToken, agentToken))
    .limit(1);
  
  if (!agent || agent.status !== "active") {
    return null;
  }
  
  return agent;
}

export async function getAgentByPublicKey(publicKey: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.publicKey, publicKey))
    .limit(1);
  
  return agent || null;
}

export async function getUserAgents(userId: string) {
  return db
    .select()
    .from(agents)
    .where(eq(agents.userId, userId));
}

export async function updateAgent(
  agentId: string,
  userId: string,
  updates: Partial<{
    name: string;
    description: string;
    image: string;
    skills: string[];
    status: string;
    rewardWallet: string | null;
    claimMethod: string;
    avatarUrl: string | null;
    twitterHandle: string | null;
  }>
) {
  const [agent] = await db
    .update(agents)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(agents.id, agentId))
    .returning();
  
  return agent;
}

export function signMessage(message: string, secretKey: string): string {
  const secretBytes = bs58.decode(secretKey);
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretBytes);
  return bs58.encode(signature);
}

export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
