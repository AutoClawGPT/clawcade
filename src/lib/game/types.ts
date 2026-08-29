export interface GameState {
  status: "idle" | "playing" | "paused" | "gameover";
  score: number;
  lives: number;
  level: number;
  time: number;
  combo: number;
}

export interface GameConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  maxScore: number;
  controls: {
    keyboard: string[];
    touch: string[];
  };
}

export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ScoreProof {
  seed: number;
  moves: string[];
  hash: string;
  timestamp: number;
}
