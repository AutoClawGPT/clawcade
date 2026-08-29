/**
 * ClawPump API Client
 * Base URL: https://clawpump.tech
 * Auth: Bearer token via `cpk_...` key (each user connects their OWN key)
 * Real API calls — no mocks. The MCP server is OAuth-only; use the REST API
 * (/api/v1/*) driven by the user's connected cpk_ key.
 */

export const CLAWPUMP_BASE = process.env.CLAWPUMP_API_URL || "https://clawpump.tech";
const PLATFORM_KEY = process.env.CLAWPUMP_API_KEY || "";

function authHeaders(userApiKey?: string): Record<string, string> {
  const key = userApiKey || PLATFORM_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

export interface ClawPumpAgent {
  id: string;
  name: string;
  status: string;
  walletAddress: string;
  skills: string[];
  model: string;
  persona: string;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  meta?: { timestamp: string; requestId: string };
}

export interface ClawPumpSkill {
  slug: string;
  name: string;
  description: string;
  alwaysOn: boolean;
}

export interface ClawPumpToken {
  mintAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  marketCap: number;
  price: number;
  volume24h: number;
  volumeAllTime: number;
  liquidity: number;
  agentId: string;
  agentName: string;
  isGraduated: boolean;
  verified: boolean;
  source: string;
  launchPlatform: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// AGENTS
// ──────────────────────────────────────────────

export async function listAgents(
  userApiKey?: string,
  opts?: { fresh?: boolean }
): Promise<ClawPumpAgent[]> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents`, {
    headers: authHeaders(userApiKey),
    ...(opts?.fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: 30 } }),
  });
  if (!res.ok) throw new Error(`ClawPump listAgents: ${res.status}`);
  const data = await res.json();
  return data.agents || [];
}

export async function getAgent(
  agentId: string,
  userApiKey?: string
): Promise<ClawPumpAgent> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents/${agentId}`, {
    headers: authHeaders(userApiKey),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`ClawPump getAgent: ${res.status}`);
  return res.json();
}

export async function createAgent(
  params: { name: string; persona?: string; model?: string; skills?: string[] },
  userApiKey?: string
): Promise<ClawPumpAgent> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`ClawPump createAgent: ${res.status}`);
  return res.json();
}

export async function startAgent(
  agentId: string,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents/${agentId}/start`, {
    method: "POST",
    headers: authHeaders(userApiKey),
  });
  if (!res.ok) throw new Error(`ClawPump startAgent: ${res.status}`);
  return res.json();
}

export async function stopAgent(
  agentId: string,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents/${agentId}/stop`, {
    method: "POST",
    headers: authHeaders(userApiKey),
  });
  if (!res.ok) throw new Error(`ClawPump stopAgent: ${res.status}`);
  return res.json();
}

export async function listSkills(
  userApiKey?: string
): Promise<ClawPumpSkill[]> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/skills`, {
    headers: authHeaders(userApiKey),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`ClawPump listSkills: ${res.status}`);
  const data = await res.json();
  return data.skills || [];
}

// ──────────────────────────────────────────────
// CHAT
// ──────────────────────────────────────────────

export async function chatWithAgent(
  agentId: string,
  message: string,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/agents/${agentId}/chat`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump chatWithAgent: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getMessages(
  agentId: string,
  opts?: { limit?: number; before?: string },
  userApiKey?: string
): Promise<unknown> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set("limit", String(opts.limit));
  if (opts?.before) q.set("before", opts.before);
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/agents/${agentId}/messages?${q.toString()}`,
    { headers: authHeaders(userApiKey) }
  );
  if (!res.ok) throw new Error(`ClawPump getMessages: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// TOKENS / MARKET
// ──────────────────────────────────────────────

export async function getTokens(
  sort: "new" | "hot" | "mcap" | "volume" = "hot",
  limit = 50,
  offset = 0,
  userApiKey?: string
): Promise<ClawPumpToken[]> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/tokens?sort=${sort}&limit=${limit}&offset=${offset}`,
    { headers: authHeaders(userApiKey), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`ClawPump getTokens: ${res.status}`);
  const data = await res.json();
  return data.tokens || [];
}

// ──────────────────────────────────────────────
// SWAP (Jupiter)
// ──────────────────────────────────────────────

export async function swapQuote(
  params: { inputMint: string; outputMint: string; amount: string },
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/swap/quote`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify({
      input_mint: params.inputMint,
      output_mint: params.outputMint,
      amount: params.amount,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump swapQuote: ${res.status} ${text}`);
  }
  return res.json();
}

// ──────────────────────────────────────────────
// MARKETPLACE
// ──────────────────────────────────────────────

export async function browseMarketplace(
  category?: string,
  search?: string,
  limit = 20,
  userApiKey?: string
): Promise<unknown> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  params.set("limit", String(limit));
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/marketplace?${params.toString()}`,
    { headers: authHeaders(userApiKey), next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`ClawPump browseMarketplace: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// WALLET / BALANCE
// ──────────────────────────────────────────────

export async function getWalletSummaries(
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/wallets`, {
    headers: authHeaders(userApiKey),
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`ClawPump getWalletSummaries: ${res.status}`);
  return res.json();
}

export async function getAgentBalance(
  agentId: string,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/agents/${agentId}/balance`,
    { headers: authHeaders(userApiKey), next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error(`ClawPump getAgentBalance: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// TOKEN LAUNCH
// ──────────────────────────────────────────────

export async function launchTokenGasless(
  params: {
    symbol: string;
    description: string;
    name?: string;
    agentId?: string;
    imageUrl?: string;
    image_url?: string;
    network?: string;
    initialBuySol?: number | string;
    twitter?: string;
    website?: string;
    devBuy?: string;
  },
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/launch`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump launchTokenGasless: ${res.status} ${text}`);
  }
  return res.json();
}

export async function launchTokenSelfFunded(
  params: {
    name: string;
    symbol: string;
    description: string;
    agentId?: string;
    agentName?: string;
    walletAddress?: string;
    imageUrl?: string;
    image_url?: string;
    network?: string;
    initialBuySol?: number | string;
    devBuy?: string;
  },
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/launch`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify({ ...params, selfFunded: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump launchTokenSelfFunded: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getAgentMessages(
  agentId: string,
  userApiKey?: string,
  limit = 30
): Promise<unknown> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/agents/${agentId}/messages?limit=${limit}`,
    { headers: authHeaders(userApiKey), next: { revalidate: 5 } }
  );
  if (!res.ok) throw new Error(`ClawPump getMessages: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// PONS LAUNCH (Robinhood Chain — gasless)
// ──────────────────────────────────────────────

export interface PonsLaunchParams {
  agentId: string;
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  payoutWallet: string;
}

export async function launchPonsToken(
  params: PonsLaunchParams,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(`${CLAWPUMP_BASE}/api/v1/launch/pons`, {
    method: "POST",
    headers: authHeaders(userApiKey),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump launchPonsToken: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getPonsLaunches(
  agentId: string,
  userApiKey?: string
): Promise<{ launches: unknown[] }> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/agents/${agentId}/pons/launches`,
    { headers: authHeaders(userApiKey), next: { revalidate: 10 } }
  );
  if (!res.ok) throw new Error(`ClawPump getPonsLaunches: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// AUTOMATIONS (price triggers / scheduled actions)
// ──────────────────────────────────────────────

export async function createAutomation(
  params: {
    agentId: string;
    name: string;
    trigger: { type: string; mint?: string; operator?: string; priceUsd?: number; schedule?: string };
    action: { type: string; prompt?: string };
    triggerOnce?: boolean;
  },
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/agents/${params.agentId}/automations`,
    {
      method: "POST",
      headers: authHeaders(userApiKey),
      body: JSON.stringify({
        name: params.name,
        trigger: params.trigger,
        action: params.action,
        triggerOnce: params.triggerOnce,
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClawPump createAutomation: ${res.status} ${text}`);
  }
  return res.json();
}

export async function listAutomations(
  agentId: string,
  userApiKey?: string
): Promise<unknown> {
  const res = await fetch(
    `${CLAWPUMP_BASE}/api/v1/agents/${agentId}/automations`,
    { headers: authHeaders(userApiKey), next: { revalidate: 15 } }
  );
  if (!res.ok) throw new Error(`ClawPump listAutomations: ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// BATCH EXPORT
// ──────────────────────────────────────────────

export const clawpump = {
  listAgents,
  getAgent,
  createAgent,
  startAgent,
  stopAgent,
  listSkills,
  chatWithAgent,
  getMessages,
  getTokens,
  swapQuote,
  browseMarketplace,
  getWalletSummaries,
  getAgentBalance,
  launchTokenGasless,
  launchTokenSelfFunded,
  launchPonsToken,
  getPonsLaunches,
  createAutomation,
  listAutomations,
  getAgentMessages,
};
