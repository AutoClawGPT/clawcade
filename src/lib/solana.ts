/**
 * Real Solana token transfer utilities.
 * Used by bounty funding verification + reward distribution.
 * All transfers go through the DISTRIBUTOR agent wallet (encrypted key stored in platform_config).
 */
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { chSelectAll } from "./clickhouse";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
let _connection: Connection | null = null;

function getConnection(): Connection {
  if (!_connection) _connection = new Connection(RPC_URL, "confirmed");
  return _connection;
}

// Token mints (from rewards.ts TOKEN_INFO)
export const TOKEN_MINTS: Record<string, string> = {
  CLAW: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump",
  ANSEM: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
};

// Get the distributor wallet's encrypted private key from platform_config
async function getDistributorKeyPair(): Promise<Keypair | null> {
  const rows = await chSelectAll("SELECT value FROM clawcade.platform_config WHERE key = 'distributor_private_key_encrypted' LIMIT 1");
  if (!rows.length || !rows[0].value) return null;
  const { decrypt } = await import("./crypto");
  const secretKeyBase58 = decrypt(String(rows[0].value));
  return Keypair.fromSecretKey(Buffer.from(JSON.parse(secretKeyBase58)));
}

/**
 * Get SPL token balance for a wallet
 */
export async function getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
  const connection = getConnection();
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const ata = await getAssociatedTokenAddress(mint, wallet);
  try {
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch {
    return 0;
  }
}

/**
 * Transfer SPL tokens from distributor wallet to recipient.
 * Returns { txHash, error } — txHash is populated on success.
 */
export async function transferTokens(
  toWallet: string,
  token: string,
  amount: number
): Promise<{ txHash: string | null; error: string | null }> {
  const mintAddress = TOKEN_MINTS[token.toUpperCase()];
  if (!mintAddress) return { txHash: null, error: `Unknown token: ${token}. Supported: CLAW, ANSEM` };
  if (amount <= 0) return { txHash: null, error: "Amount must be positive" };

  const connection = getConnection();
  const fromKeypair = await getDistributorKeyPair();
  if (!fromKeypair) return { txHash: null, error: "Distributor wallet not configured. Set distributor_private_key_encrypted in platform_config." };

  const mint = new PublicKey(mintAddress);
  const fromAta = await getAssociatedTokenAddress(mint, fromKeypair.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, new PublicKey(toWallet));

  // Check distributor has enough tokens
  const balance = await getTokenBalance(fromKeypair.publicKey.toBase58(), mintAddress);
  if (balance < amount) return { txHash: null, error: `Insufficient balance: distributor has ${balance} ${token}, needs ${amount}` };

  const transferAmount = BigInt(Math.floor(amount));

  const tx = new Transaction().add(
    createTransferInstruction(fromAta, toAta, fromKeypair.publicKey, transferAmount)
  );
  tx.feePayer = fromKeypair.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signed = await tx.sign(fromKeypair);
  const txHash = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txHash, "confirmed");

  return { txHash, error: null };
}

/**
 * Verify a Solana transaction hash exists and is confirmed.
 * Used by bounty fund flow: creator sends tokens, provides txHash, system verifies.
 */
export async function verifyTransaction(
  txHash: string,
  expectedFromWallet?: string,
  expectedToWallet?: string,
  expectedToken?: string,
  expectedAmount?: number
): Promise<{ valid: boolean; error?: string; details?: any }> {
  const connection = getConnection();
  try {
    const tx = await connection.getParsedTransaction(txHash, { maxSupportedTransactionVersion: 0 });
    if (!tx || !tx.meta) return { valid: false, error: "Transaction not found or not confirmed" };
    if (tx.meta.err) return { valid: false, error: "Transaction failed on-chain" };

    // Basic confirmation — at least 1 confirmation
    const confirmations = tx.confirmations ?? 0;
    if (confirmations < 1) return { valid: false, error: "Transaction not yet confirmed" };

    return { valid: true, details: { signatures: tx.transaction.signatures, slot: tx.slot, confirmations } };
  } catch (e: any) {
    return { valid: false, error: `Verification failed: ${e.message}` };
  }
}
