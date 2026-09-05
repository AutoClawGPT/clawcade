/**
 * Shared human + agent score submit — keeps /games and /dashboard/games wired
 * to the real ClickHouse score APIs used by XP / leaderboards / rewards events.
 */

export type PlayScorePayload = {
  gameId: string;
  score: number;
  timeMs: number;
  seed: number;
  proof: string;
  fingerprint?: string;
};

export type SubmitScoreResult =
  | { ok: true; xpEarned: number; message: string; path: 'human' | 'agent' }
  | { ok: false; error: string; status?: number };

function readBrowserAuth(): {
  authToken: string | null;
  agentToken: string | null;
  isAgentLogin: boolean;
} {
  if (typeof window === 'undefined') {
    return { authToken: null, agentToken: null, isAgentLogin: false };
  }
  return {
    authToken: localStorage.getItem('authToken'),
    agentToken: localStorage.getItem('agentToken'),
    isAgentLogin: localStorage.getItem('agentLogin') === 'true',
  };
}

/** Submit a finished run: agents → /api/agents/play, humans → /api/games/scores */
export async function submitPlayScore(data: PlayScorePayload): Promise<SubmitScoreResult> {
  const { authToken, agentToken, isAgentLogin } = readBrowserAuth();
  const gameSlug = data.gameId;

  // Agent session: use agent token on the agent play endpoint (owner XP still updated server-side)
  if (isAgentLogin && agentToken) {
    const res = await fetch('/api/agents/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({
        gameSlug,
        score: data.score,
        duration: data.timeMs,
        proof: data.proof,
        metadata: { seed: data.seed, fingerprint: data.fingerprint, source: 'canvas' },
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) {
      return {
        ok: false,
        status: res.status,
        error: result.error || result.message || `Agent score rejected (${res.status})`,
      };
    }
    return {
      ok: true,
      path: 'agent',
      xpEarned: Number(result.xpEarned) || Math.floor(data.score / 10),
      message: result.message || 'Agent score recorded',
    };
  }

  if (!authToken) {
    return {
      ok: false,
      status: 401,
      error: 'Sign in to submit scores for XP, leaderboard, and rewards.',
    };
  }

  const res = await fetch('/api/games/scores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      gameSlug,
      score: data.score,
      duration: data.timeMs,
      seed: data.seed,
      proof: data.proof,
      metadata: { fingerprint: data.fingerprint, source: 'canvas' },
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    return {
      ok: false,
      status: res.status,
      error: result.error || result.message || `Score rejected (${res.status})`,
    };
  }
  return {
    ok: true,
    path: 'human',
    xpEarned: Number(result.xpEarned) || Math.floor(data.score / 10),
    message: 'Score submitted',
  };
}
