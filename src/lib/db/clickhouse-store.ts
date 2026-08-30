// CLAWCADE data store backed by ClickHouse Cloud.
// Replaces the former Postgres (Drizzle) layer. All tables live in
// ClickHouse under the `clawcade` database.

import { chInsert, chUpdate, chDelete, chSelectFirst, chSelectAll, ChRow, escLiteral } from "../clickhouse";
import { v4 as uuid } from "uuid";



const Q = (s: string) => "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const S = (v: unknown, def = ""): string => (v === null || v === undefined ? def : String(v));
const NUM = (v: unknown, def = 0): number => {
  const n = Number(v ?? def);
  return Number.isNaN(n) ? def : n;
};
const BOOL = (v: unknown): boolean => v === true || v === 1 || String(v).toLowerCase() === "true";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ClickHouse shared-storage replicas can briefly not see a just-inserted row.
// Retry post-write reads a few times before giving up.
async function withRetry<T>(fn: () => Promise<T | null>, attempts = 6): Promise<T | null> {
  for (let i = 0; i < attempts; i++) {
    const r = await fn();
    if (r) return r;
    await sleep(250);
  }
  return null;
}
// ---------- helpers ----------
export function newId(): string {
  return uuid();
}

function rowToUser(r: ChRow | null) {
  if (!r) return null;
  return {
    id: S(r.id),
    email: S(r.email),
    name: S(r.name) || null,
    image: S(r.image),
    walletAddress: S(r.wallet_address) || null,
    publicKey: S(r.public_key),
    authToken: S(r.auth_token),
    role: S(r.role, "user"),
    level: NUM(r.level, 1),
    xp: NUM(r.xp),
    totalScore: NUM(r.total_score),
    totalGames: NUM(r.total_games),
    wins: NUM(r.wins),
    losses: NUM(r.losses),
    winStreak: NUM(r.win_streak),
    bestStreak: NUM(r.best_streak),
    tokensEarned: NUM(r.tokens_earned),
    encryptedKeys: r.encrypted_keys ? (() => { try { return JSON.parse(String(r.encrypted_keys)); } catch { return {}; } })() : undefined,
    payoutWallet: S(r.payout_wallet) || null,
    rewardWallet: S(r.reward_wallet) || null,
    claimMethod: S(r.claim_method, "manual"),
    walletSecretEncrypted: S(r.wallet_secret_encrypted),
    twitterHandle: S(r.twitter_handle) || null,
    twitterVerified: BOOL(r.twitter_verified),
    twitterVerifyCode: S(r.twitter_verify_code) || null,
    twitterVerifyExpiry: r.twitter_verify_expiry ? new Date(String(r.twitter_verify_expiry)) : null,
    createdAt: r.created_at ? new Date(String(r.created_at)) : new Date(),
    updatedAt: r.updated_at ? new Date(String(r.updated_at)) : new Date(),
  };
}

function rowToAgent(r: ChRow | null) {
  if (!r) return null;
  return {
    id: S(r.id),
    userId: S(r.user_id),
    name: S(r.name),
    description: S(r.description),
    image: S(r.image),
    publicKey: S(r.public_key),
    secretKeyEncrypted: S(r.secret_key_encrypted),
    agentToken: S(r.agent_token),
    status: S(r.status, "active"),
    isPublic: BOOL(r.is_public ?? 1),
    acceptingBids: BOOL(r.accepting_bids ?? 1),
    skills: r.skills ? (() => { try { const a = JSON.parse(String(r.skills)); return Array.isArray(a) ? a : []; } catch { return []; } })() : [],
    totalScore: NUM(r.total_score),
    totalGames: NUM(r.total_games),
    tokenMint: S(r.token_mint) || null,
    walletAddress: S(r.wallet_address) || null,
    rewardWallet: S(r.reward_wallet) || null,
    claimMethod: S(r.claim_method, "manual"),
    walletSecretEncrypted: S(r.wallet_secret_encrypted),
    clawpumpAgentId: S(r.clawpump_agent_id) || null,
    clawpumpWalletAddress: S(r.clawpump_wallet_address) || null,
    persona: S(r.persona),
    runtimeTier: S(r.runtime_tier, "standard"),
    avatarUrl: S(r.avatar_url),
    isPublicDescription: S(r.public_description),
    twitterVerified: BOOL(r.twitter_verified),
    twitterHandle: S(r.twitter_handle) || null,
    trustTier: S(r.trust_tier, "unrated"),
    reputationScore: NUM(r.reputation_score),
    createdAt: r.created_at ? new Date(String(r.created_at)) : new Date(),
    updatedAt: r.updated_at ? new Date(String(r.updated_at)) : new Date(),
  };
}

function rowToGame(r: ChRow | null) {
  if (!r) return null;
  return {
    id: S(r.id),
    name: S(r.name),
    slug: S(r.slug),
    description: S(r.description),
    category: S(r.category),
    difficulty: S(r.difficulty, "medium"),
    maxScore: NUM(r.max_score),
    isActive: BOOL(r.is_active ?? 1),
    imageUrl: S(r.image_url),
    createdAt: r.created_at ? new Date(String(r.created_at)) : new Date(),
  };
}

function rowToScore(r: ChRow | null) {
  if (!r) return null;
  return {
    id: S(r.id),
    userId: S(r.user_id),
    gameId: S(r.game_id),
    agentId: S(r.agent_id) || null,
    score: NUM(r.score),
    duration: NUM(r.duration),
    proof: S(r.proof),
    verified: BOOL(r.verified ?? 1),
    metadata: r.metadata ? (() => { try { return JSON.parse(String(r.metadata)); } catch { return undefined; } })() : undefined,
    createdAt: r.created_at ? new Date(String(r.created_at)) : new Date(),
  };
}

export interface Db {
  // to satisfy call sites that expect a "db" object with common shapes,
  // we expose tables as arrays of rows for simple reads.
}

// ---------- USERS ----------
export async function countUsers(): Promise<number> {
  const r = await chSelectFirst("SELECT count() AS c FROM clawcade.users");
  return Number(r?.c || 0);
}

export async function listUsers(): Promise<any[]> {
  const rows = await chSelectAll("SELECT * FROM clawcade.users");
  return rows.map((r) => rowToUser(r)).filter(Boolean) as any[];
}

export async function findUserByEmail(email: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.users WHERE email = " + Q(email) + " LIMIT 1");
  return rowToUser(r);
}

export async function findUserByAuthToken(token: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.users WHERE auth_token = " + Q(token) + " LIMIT 1");
  return rowToUser(r);
}

export async function findUserById(id: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.users WHERE id = " + Q(id) + " LIMIT 1");
  return rowToUser(r);
}

export async function findUserByVerificationCode(code: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.users WHERE twitter_verify_code = " + Q(code) + " LIMIT 1");
  return rowToUser(r);
}

export async function createUser(data: Record<string, any>) {
  const id = data.id || newId();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const row: Record<string, any> = {
    id,
    email: data.email,
    name: data.name || "",
    image: data.image || "",
    wallet_address: data.walletAddress || "",
    public_key: data.publicKey || "",
    auth_token: data.authToken || "",
    role: data.role || "user",
    level: data.level ?? 1,
    xp: data.xp ?? 0,
    total_score: data.totalScore ?? 0,
    total_games: data.totalGames ?? 0,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    win_streak: data.winStreak ?? 0,
    best_streak: data.bestStreak ?? 0,
    tokens_earned: data.tokensEarned ?? 0,
    encrypted_keys: data.encryptedKeys ? JSON.stringify(data.encryptedKeys) : "",
    payout_wallet: data.payoutWallet || "",
    reward_wallet: data.rewardWallet || "",
    claim_method: data.claimMethod || "manual",
    wallet_secret_encrypted: data.walletSecretEncrypted || "",
    twitter_handle: data.twitterHandle || "",
    twitter_verified: data.twitterVerified ? 1 : 0,
    twitter_verify_code: "",
    twitter_verify_expiry: null,
    created_at: now,
    updated_at: now,
  };
  await chInsert("clawcade.users", [row]);
  return withRetry(() => findUserById(id));
}

export async function updateUser(id: string, data: Record<string, any>): Promise<any> {
  const sets: Record<string, any> = {};
  const map: Record<string, string> = {
    name: "name", image: "image", walletAddress: "wallet_address", publicKey: "public_key",
    authToken: "auth_token", role: "role", level: "level", xp: "xp", totalScore: "total_score",
    totalGames: "total_games", wins: "wins", losses: "losses", winStreak: "win_streak",
    bestStreak: "best_streak", tokensEarned: "tokens_earned", payoutWallet: "payout_wallet",
    rewardWallet: "reward_wallet", claimMethod: "claim_method", walletSecretEncrypted: "wallet_secret_encrypted",
    twitterHandle: "twitter_handle", twitterVerifyCode: "twitter_verify_code",
    twitterVerified: "twitter_verified", twitterVerifyExpiry: "twitter_verify_expiry",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in data) {
      let v: any = data[key];
      if (key === "encryptedKeys") v = JSON.stringify(v || {});
      else if (key === "twitterVerified") v = v ? 1 : 0;
      else if (v === undefined) v = null;
      sets[col] = v;
    }
  }
  if ("encryptedKeys" in data) sets.encrypted_keys = JSON.stringify(data.encryptedKeys || {});
  await chUpdate("clawcade.users", sets, "id = " + Q(id));
  return withRetry(() => findUserById(id));
}

// ---------- AGENTS ----------
export async function findAgentByToken(token: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.agents WHERE agent_token = " + Q(token) + " LIMIT 1");
  return rowToAgent(r);
}
export async function findAgentById(id: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.agents WHERE id = " + Q(id) + " LIMIT 1");
  return rowToAgent(r);
}
export async function findAgentByPublicKey(pk: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.agents WHERE public_key = " + Q(pk) + " LIMIT 1");
  return rowToAgent(r);
}
export async function findAgentByName(name: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.agents WHERE name = " + Q(name) + " LIMIT 1");
  return rowToAgent(r);
}
export async function listUserAgents(userId: string) {
  const rows = await chSelectAll("SELECT * FROM clawcade.agents WHERE user_id = " + Q(userId));
  return rows.map((r) => rowToAgent(r)).filter(Boolean) as any[];
}
export async function listAgents() {
  const rows = await chSelectAll("SELECT * FROM clawcade.agents");
  return rows.map((r) => rowToAgent(r)).filter(Boolean) as any[];
}
export async function createAgent(data: Record<string, any>) {
  const id = data.id || newId();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await chInsert("clawcade.agents", [{
    id,
    user_id: data.userId,
    name: data.name || "",
    description: data.description || "",
    image: data.image || "",
    public_key: data.publicKey || "",
    secret_key_encrypted: data.secretKeyEncrypted || "",
    agent_token: data.agentToken || "",
    status: data.status || "active",
    is_public: data.isPublic === false ? 0 : 1,
    accepting_bids: data.acceptingBids === false ? 0 : 1,
    persona: data.persona || "",
    runtime_tier: data.runtimeTier || "standard",
    avatar_url: data.avatarUrl || "",
    wallet_address: data.walletAddress || "",
    reward_wallet: data.rewardWallet || "",
    claim_method: data.claimMethod || "manual",
    wallet_secret_encrypted: data.walletSecretEncrypted || "",
    token_mint: data.tokenMint || "",
    skills: JSON.stringify(data.skills || []),
    total_score: data.totalScore ?? 0,
    total_games: data.totalGames ?? 0,
    clawpump_agent_id: data.clawpumpAgentId || "",
    clawpump_wallet_address: data.clawpumpWalletAddress || "",
    public_description: data.publicDescription || "",
    created_at: now,
    updated_at: now,
  }]);
  return withRetry(() => findAgentById(id));
}
export async function updateAgentRows(id: string, data: Record<string, any>): Promise<any> {
  const sets: Record<string, any> = {};
  const allowed: Record<string, string> = {
    name: "name", description: "description", image: "image", skills: "skills",
    status: "status", rewardWallet: "reward_wallet", claimMethod: "claim_method",
    avatarUrl: "avatar_url", image2: "image", isPublic: "is_public",
    acceptingBids: "accepting_bids", totalScore: "total_score", totalGames: "total_games",
    tokenMint: "token_mint", walletAddress: "wallet_address",
  };
  for (const [key, col] of Object.entries(allowed)) {
    if (key in data) {
      let v: any = data[key];
      if (key === "skills") v = JSON.stringify(v || []);
      else if (key === "isPublic" || key === "acceptingBids") v = v ? 1 : 0;
      sets[col] = v === undefined ? null : v;
    }
  }
  if (Object.keys(sets).length > 0) await chUpdate("clawcade.agents", sets, "id = " + Q(id));
  return withRetry(() => findAgentById(id));
}
export async function deleteAgentRows(id: string): Promise<void> {
  await chDelete("clawcade.agents", "id = " + Q(id));
}

// ---------- GAMES ----------
export async function listGameRows() {
  const rows = await chSelectAll("SELECT * FROM clawcade.games");
  return rows.map((r) => rowToGame(r));
}
export async function findGameBySlug(slug: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.games WHERE slug = " + Q(slug) + " LIMIT 1");
  return rowToGame(r);
}
export async function findGameById(id: string) {
  const r = await chSelectFirst("SELECT * FROM clawcade.games WHERE id = " + Q(id) + " LIMIT 1");
  return rowToGame(r);
}

// ---------- SCORES ----------
export async function insertScore(data: Record<string, any>) {
  const id = data.id || newId();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const row: Record<string, any> = {
    id,
    user_id: data.userId || "",
    game_id: data.gameId || "",
    agent_id: data.agentId || "",
    score: data.score ?? 0,
    duration: data.duration ?? 0,
    proof: data.proof || "",
    verified: data.verified === false ? 0 : 1,
    metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
    created_at: now,
  };
  await chInsert("clawcade.scores", [row]);
  return { id, ...data, createdAt: new Date(now) };
}
export async function listScoresByUser(userId: string) {
  const rows = await chSelectAll("SELECT s.*, g.name AS game_name, g.slug AS game_slug FROM clawcade.scores s LEFT JOIN clawcade.games g ON s.game_id = g.id WHERE s.user_id = " + Q(userId) + " ORDER BY s.created_at LIMIT 100");
  return rows.map((r) => ({ ...rowToScore(r), gameName: S(r.game_name), gameSlug: S(r.game_slug) }));
}
export async function listScoresByAgent(agentId: string) {
  const rows = await chSelectAll("SELECT s.*, g.name AS game_name, g.slug AS game_slug FROM clawcade.scores s LEFT JOIN clawcade.games g ON s.game_id = g.id WHERE s.agent_id = " + Q(agentId) + " ORDER BY s.created_at LIMIT 100");
  return rows.map((r) => ({ ...rowToScore(r), gameName: S(r.game_name), gameSlug: S(r.game_slug) }));
}

// ---------- REWARDS / platform config ----------
export async function upsertPlatformConfig(key: string, value: string) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await chInsert("clawcade.platform_config", [{ key, value, created_at: now, updated_at: now }]);
}
export async function getPlatformConfig(key: string): Promise<string | null> {
  const r = await chSelectFirst("SELECT value FROM clawcade.platform_config WHERE key = " + Q(key) + " LIMIT 1");
  return r ? String(r.value) : null;
}
export async function listRewards() {
  return chSelectAll("SELECT * FROM clawcade.rewards ORDER BY created_at DESC LIMIT 100");
}
export async function insertReward(data: Record<string, any>) {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await chInsert("clawcade.rewards", [{
    id: data.id || newId(),
    user_id: data.userId || "",
    agent_id: data.agentId || "",
    type: data.type || "",
    amount: data.amount ?? 0,
    token: data.token || "",
    status: data.status || "pending",
    rank: data.rank ?? 0,
    period: data.period || "",
    created_at: now,
  }]);
}
