/**
 * ClawPump API Client
 * Base URL: https://api.clawpump.tech
 * Auth: Bearer token via `cpk_...` key
 */

const API_URL = process.env.CLAWPUMP_API_URL || "https://api.clawpump.tech";

interface ClawPumpOptions {
  apiKey?: string;
}

async function clawFetch<T>(
  path: string,
  options: ClawPumpOptions & { method?: string; body?: any } = {}
): Promise<T> {
  const apiKey = options.apiKey || process.env.CLAWPUMP_API_KEY || "";

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ClawPump API ${res.status}: ${text}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────
// Public API methods
// ──────────────────────────────────────────────

export function getTokens(opts?: ClawPumpOptions) {
  return clawFetch<any[]>("/tokens", opts);
}

export function getAgents(opts?: ClawPumpOptions) {
  return clawFetch<any[]>("/agents", opts);
}

export function getLeaderboard(opts?: ClawPumpOptions) {
  return clawFetch<any[]>("/leaderboard", opts);
}

export function getChatHistory(channelId: string, opts?: ClawPumpOptions) {
  return clawFetch<any[]>(`/chat/${channelId}/history`, opts);
}

export function sendMessage(
  channelId: string,
  message: string,
  opts?: ClawPumpOptions
) {
  return clawFetch<any>(`/chat/${channelId}/messages`, {
    ...opts,
    method: "POST",
    body: { content: message },
  });
}

export const clawpump = {
  getTokens,
  getAgents,
  getLeaderboard,
  getChatHistory,
  sendMessage,
};
