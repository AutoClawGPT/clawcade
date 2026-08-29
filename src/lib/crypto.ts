import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY not set");
  if (key.length === 64) return Buffer.from(key, "hex");
  return Buffer.from(key.padEnd(32, "0").slice(0, 32));
}

/**
 * Encrypt a plaintext string → "iv:authTag:ciphertext" (all hex)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt "iv:authTag:ciphertext" → plaintext
 */
export function decrypt(encryptedPayload: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertext] = encryptedPayload.split(":");

  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random API key with optional prefix
 */
export function generateApiKey(prefix = "cwa"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/** Alias for encrypt — used by agent.ts */
export const encryptKey = encrypt;

/** Alias for decrypt — used by agent.ts */
export const decryptKey = decrypt;
