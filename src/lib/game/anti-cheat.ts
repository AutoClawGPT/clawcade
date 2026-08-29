// CLAWCADE Anti-Cheat System
// Seeded RNG, score validation, proof generation, fingerprinting

import { MoveEntry } from './engine';

// Mulberry32 seeded RNG (matches engine)
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Max possible score per second per game (generous upper bound)
const MAX_SCORE_PER_SECOND: Record<string, number> = {
  'crypto-smash': 50,   // ~50 pts/sec max with combos
  'chomper': 30,        // ~30 pts/sec collecting tokens
  'swarm': 20,          // ~20 pts/sec killing enemies
  'cascade': 100,       // ~100 pts/sec with chain combos
  'rocket-ride': 40,    // ~40 pts/sec
};

export interface ScoreSubmission {
  gameId: string;
  score: number;
  timeMs: number;
  seed: number;
  moves: MoveEntry[];
  fingerprint: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateScore(sub: ScoreSubmission): ValidationResult {
  const { gameId, score, timeMs, moves } = sub;

  // Basic sanity
  if (score < 0) return { valid: false, reason: 'Negative score' };
  if (timeMs < 1000) return { valid: false, reason: 'Game too short' };
  if (timeMs > 600000) return { valid: false, reason: 'Game too long (>10min)' };

  // Score rate check
  const maxRate = MAX_SCORE_PER_SECOND[gameId] ?? 100;
  const seconds = timeMs / 1000;
  const maxPossible = maxRate * seconds;
  if (score > maxPossible * 1.2) {
    return { valid: false, reason: `Score ${score} exceeds max possible ${Math.floor(maxPossible)} for ${seconds.toFixed(1)}s` };
  }

  // Must have some input moves
  if (moves.length < 3) {
    return { valid: false, reason: 'Insufficient input data' };
  }

  // Move timestamps must be non-decreasing and within game time
  for (let i = 1; i < moves.length; i++) {
    if (moves[i].t < moves[i - 1].t) {
      return { valid: false, reason: 'Non-monotonic timestamps' };
    }
    if (moves[i].t > timeMs + 1000) {
      return { valid: false, reason: 'Move timestamp exceeds game time' };
    }
  }

  return { valid: true };
}

// Generate a proof hash from seed + moves
export async function generateProof(seed: number, moves: MoveEntry[]): Promise<string> {
  const data = JSON.stringify({ seed, moves });
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const chr = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

// Client fingerprinting (lightweight)
export function getFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const parts = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    navigator.language,
    new Date().getTimezoneOffset(),
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}
