// CLAWCADE Game Engine Core
// Provides a full game loop, input, sound, particles, collision, and state management.

export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
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

export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  touches: { x: number; y: number; id: number }[];
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  seed?: number;
  onScoreChange?: (score: number) => void;
  onStateChange?: (state: GameState) => void;
  onTimeChange?: (time: number) => void;
}

// Sound effects via Web Audio API
class SoundEngine {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  play(type: 'hit' | 'collect' | 'die' | 'powerup' | 'shoot' | 'explosion' | 'combo') {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;

      switch (type) {
        case 'hit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case 'collect':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        case 'die':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
        case 'powerup':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        case 'shoot':
          osc.type = 'square';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        case 'explosion':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
        case 'combo':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, now);
          osc.frequency.setValueAtTime(700, now + 0.05);
          osc.frequency.setValueAtTime(900, now + 0.1);
          osc.frequency.setValueAtTime(1100, now + 0.15);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
      }
    } catch {
      // Audio may not be available
    }
  }
}

// Seeded RNG (mulberry32)
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

// Move log for proof generation
export interface MoveEntry {
  t: number; // timestamp (ms into game)
  a: string; // action
  x?: number;
  y?: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: GameState = 'idle';
  score: number = 0;
  time: number = 0; // ms elapsed while playing
  rng: SeededRNG;
  sound: SoundEngine;
  input: InputState;
  particles: Particle[] = [];
  moves: MoveEntry[] = [];

  private rafId: number = 0;
  private lastTs: number = 0;
  private animFrame: ((dt: number) => void) | null = null;
  private renderFrame: (() => void) | null = null;
  private boundLoop = this.loop.bind(this);
  private boundKeyD = this.onKeyDown.bind(this);
  private boundKeyU = this.onKeyUp.bind(this);
  private boundMouseD = this.onMouseDown.bind(this);
  private boundMouseU = this.onMouseUp.bind(this);
  private boundMouseM = this.onMouseMove.bind(this);
  private boundTouchS = this.onTouchStart.bind(this);
  private boundTouchE = this.onTouchEnd.bind(this);
  private boundTouchM = this.onTouchMove.bind(this);

  onScoreChange?: (s: number) => void;
  onStateChange?: (s: GameState) => void;
  onTimeChange?: (t: number) => void;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;
    this.ctx = config.canvas.getContext('2d')!;
    this.width = config.width;
    this.height = config.height;
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.rng = new SeededRNG(config.seed ?? Date.now());
    this.sound = new SoundEngine();
    this.input = { keys: new Set(), mouseX: 0, mouseY: 0, mouseDown: false, touches: [] };
    this.onScoreChange = config.onScoreChange;
    this.onStateChange = config.onStateChange;
    this.onTimeChange = config.onTimeChange;
  }

  // --- Lifecycle ---
  start() {
    this.state = 'playing';
    this.score = 0;
    this.time = 0;
    this.particles = [];
    this.moves = [];
    this.lastTs = 0;
    this.emit();
    this.attachInput();
    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.state = 'idle';
    this.detachInput();
    cancelAnimationFrame(this.rafId);
    this.emit();
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.emit();
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.lastTs = 0;
      this.emit();
      this.rafId = requestAnimationFrame(this.boundLoop);
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.detachInput();
    cancelAnimationFrame(this.rafId);
    this.sound.play('die');
    this.emit();
  }

  addScore(pts: number) {
    this.score += pts;
    this.onScoreChange?.(this.score);
  }

  logMove(action: string, x?: number, y?: number) {
    this.moves.push({ t: this.time, a: action, x, y });
  }

  onUpdate(cb: (dt: number) => void) {
    this.animFrame = cb;
  }

  onRender(cb: () => void) {
    this.renderFrame = cb;
  }

  // --- Game loop ---
  private loop(ts: number) {
    if (this.state !== 'playing') return;
    if (this.lastTs === 0) this.lastTs = ts;
    const dt = Math.min(ts - this.lastTs, 50); // cap to avoid spiral
    this.lastTs = ts;
    this.time += dt;
    this.onTimeChange?.(this.time);

    // Update particles
    this.updateParticles(dt);

    // Game-specific update
    this.animFrame?.(dt);

    // Clear & render
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderFrame?.();
    this.renderParticles();

    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  // --- Particles ---
  spawnParticle(x: number, y: number, color: string, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const speed = this.rng.range(30, 120);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: this.rng.range(0.3, 0.8),
        color,
        size: this.rng.range(2, 6),
      });
    }
  }

  private updateParticles(dt: number) {
    const sDt = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * sDt;
      p.y += p.vy * sDt;
      p.life -= sDt / p.maxLife;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private renderParticles() {
    for (const p of this.particles) {
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  // --- Collision utilities ---
  static rectRect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  static circleCircle(a: Circle, b: Circle): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy < (a.r + b.r) * (a.r + b.r);
  }

  static pointInRect(px: number, py: number, r: Rect): boolean {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  static circleRect(c: Circle, r: Rect): boolean {
    const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(c.y, r.y + r.h));
    const dx = c.x - cx;
    const dy = c.y - cy;
    return dx * dx + dy * dy < c.r * c.r;
  }

  // --- Input ---
  private attachInput() {
    window.addEventListener('keydown', this.boundKeyD);
    window.addEventListener('keyup', this.boundKeyU);
    this.canvas.addEventListener('mousedown', this.boundMouseD);
    this.canvas.addEventListener('mouseup', this.boundMouseU);
    this.canvas.addEventListener('mousemove', this.boundMouseM);
    this.canvas.addEventListener('touchstart', this.boundTouchS, { passive: false });
    this.canvas.addEventListener('touchend', this.boundTouchE, { passive: false });
    this.canvas.addEventListener('touchmove', this.boundTouchM, { passive: false });
  }

  private detachInput() {
    window.removeEventListener('keydown', this.boundKeyD);
    window.removeEventListener('keyup', this.boundKeyU);
    this.canvas.removeEventListener('mousedown', this.boundMouseD);
    this.canvas.removeEventListener('mouseup', this.boundMouseU);
    this.canvas.removeEventListener('mousemove', this.boundMouseM);
    this.canvas.removeEventListener('touchstart', this.boundTouchS);
    this.canvas.removeEventListener('touchend', this.boundTouchE);
    this.canvas.removeEventListener('touchmove', this.boundTouchM);
  }

  private onKeyDown(e: KeyboardEvent) {
    this.input.keys.add(e.key);
    this.logMove('kd', undefined, undefined);
  }
  private onKeyUp(e: KeyboardEvent) {
    this.input.keys.delete(e.key);
  }
  private onMouseDown(e: MouseEvent) {
    this.input.mouseDown = true;
    const r = this.canvas.getBoundingClientRect();
    this.input.mouseX = e.clientX - r.left;
    this.input.mouseY = e.clientY - r.top;
  }
  private onMouseUp() {
    this.input.mouseDown = false;
  }
  private onMouseMove(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.input.mouseX = e.clientX - r.left;
    this.input.mouseY = e.clientY - r.top;
  }
  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    this.input.touches = Array.from(e.touches).map((t) => ({
      x: t.clientX - r.left,
      y: t.clientY - r.top,
      id: t.identifier,
    }));
  }
  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    this.input.touches = Array.from(e.touches).map((t) => ({
      x: t.clientX - r.left,
      y: t.clientY - r.top,
      id: t.identifier,
    }));
  }
  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    this.input.touches = Array.from(e.touches).map((t) => ({
      x: t.clientX - r.left,
      y: t.clientY - r.top,
      id: t.identifier,
    }));
  }

  private emit() {
    this.onStateChange?.(this.state);
  }
}
