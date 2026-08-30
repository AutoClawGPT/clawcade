import { findAgentById, findAgentByToken, findAgentByPublicKey, findAgentByName, findUserById, listUserAgents, createAgent, updateAgentRows } from "@/lib/db/clickhouse-store";
import { generateApiKey, encryptKey, decryptKey } from "@/lib/crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { newId } from "@/lib/db/clickhouse-store";

function toBytes(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Empty key provided");
  if (/^0x/i.test(trimmed)) {
    throw new Error("Invalid key format: 0x-prefixed EVM addresses are not Ed25519 keys. publicKey must be a base58 or hex-encoded Ed25519 key.");
  }
  try {
    const decoded = bs58.decode(trimmed);
    if (decoded.length === 32 || decoded.length === 64) return decoded;
  } catch {}
  if (/^[0-9a-fA-F]{64}$/.test(trimmed) || /^[0-9a-fA-F]{128}$/.test(trimmed)) {
    return new Uint8Array(Buffer.from(trimmed, "hex"));
  }
  throw new Error("Invalid key format: provide a base58-encoded Ed25519 key or a plain hex string (64 or 128 chars). EVM/0x addresses are not accepted.");
}

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

export async function registerAgent(userId: string, data: AgentRegistration) {
  let secretKeyB58 = data.secretKey || "";
  let publicKeyB58 = data.publicKey || "";

  if (!secretKeyB58) {
    const kp = nacl.sign.keyPair();
    secretKeyB58 = bs58.encode(kp.secretKey);
    publicKeyB58 = bs58.encode(kp.publicKey);
  }

  const secretKeyBytes = toBytes(secretKeyB58);
  const publicKeyBytes = data.publicKey ? toBytes(data.publicKey) : secretKeyBytes.slice(32, 64);

  if (secretKeyBytes.length !== 64) {
    throw new Error("Invalid secret key length");
  }

  const derivedPublic = secretKeyBytes.slice(32, 64);
  if (data.publicKey) {
    if (Buffer.compare(Buffer.from(derivedPublic), Buffer.from(publicKeyBytes)) !== 0) {
      throw new Error("Public key does not match secret key");
    }
  }

  const pubKeyStored = data.publicKey ? publicKeyB58 : bs58.encode(derivedPublic);

  if (data.rewardWallet && !isValidSolanaWallet(data.rewardWallet)) {
    throw new Error("Invalid rewardWallet: provide a Solana address (base58, 32-byte). EVM/0x addresses are not accepted.");
  }

  const agentToken = "agent_" + newId().replace(/-/g, "");
  const secretKeyEncrypted = encryptKey(secretKeyB58);

  const agent = await createAgent({
    id: newId(),
    userId,
    name: data.name,
    description: data.description || "",
    image: (data.image && String(data.image).toLowerCase() === "skip") ? "" : (data.image || ""),
    agentToken,
    publicKey: pubKeyStored,
    secretKeyEncrypted,
    status: "active",
    skills: data.skills || [],
    clawpumpAgentId: data.clawpumpAgentId || "",
    clawpumpWalletAddress: data.clawpumpWalletAddress || "",
    persona: data.persona || "",
    avatarUrl: data.avatarUrl || "",
    rewardWallet: data.rewardWallet ? data.rewardWallet.trim() : "",
    claimMethod: data.claimMethod || "manual",
    totalGames: 0,
    totalScore: 0,
  });

  return {
    agentId: agent?.id || "",
    agentToken,
    publicKey: pubKeyStored,
    name: agent?.name || data.name,
  };
}

export async function verifyAgentToken(agentToken: string) {
  const agent = await findAgentByToken(agentToken);
  if (!agent || agent.status !== "active") return null;
  return agent;
}

export async function getAgentByPublicKey(publicKey: string) {
  return await findAgentByPublicKey(publicKey);
}

export async function getUserAgents(userId: string) {
  return await listUserAgents(userId);
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
  if (Object.keys(updates).length) await updateAgentRows(agentId, updates as Record<string, any>);
  return (await findAgentById(agentId))!;
}

export function signMessage(message: string, secretKey: string): string {
  const secretBytes = bs58.decode(secretKey);
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretBytes);
  return bs58.encode(signature);
}

export function verifySignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export { decryptKey };
