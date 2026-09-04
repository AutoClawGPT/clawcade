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
  active: boolean;
}

export interface InputState {
  keys: Set<string>;
  /** Keys that transitioned down this frame (edge) */
  keysJustPressed: Set<string>;
  /** Keys that transitioned up this frame */
  keysJustReleased: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  /** True only on the frame mouse went down */
  mouseJustPressed: boolean;
  /** True only on the frame mouse went up */
  mouseJustReleased: boolean;
  touches: { x: number; y: number; id: number }[];
  /** True when a new touch started this frame */
  touchJustPressed: boolean;
}

export type FeedbackTier = 'small' | 'medium' | 'large';

export interface GameConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  seed?: number;
  /** Scale canvas backing store by devicePixelRatio for crisp rendering (logical coords unchanged) */
  dpr?: number;
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

  /** Call from a user gesture (Start click) so browsers unmute audio */
  resume() {
    try {
      const ctx = this.getCtx();
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      // Audio may not be available
    }
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

const MAX_PARTICLES = 200;

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
  private particlePool: Particle[] = [];
  moves: MoveEntry[] = [];
  // Juice: trauma-based screen shake + hit-stop (freeze frames)
  private trauma = 0;
  private traumaDecay = 1.4; // per second
  private shakeTime = 0; // legacy compat decay window
  private shakePower = 0;
  private shakePhase = 0;
  private freezeUntil = 0;
  private reduceShake = false;

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
  private boundBlur = this.onWindowBlur.bind(this);

  /** Keys pressed since last frame (queued until consumed in loop) */
  private pendingJustPressed = new Set<string>();
  private pendingJustReleased = new Set<string>();
  private pendingMouseJustPressed = false;
  private pendingMouseJustReleased = false;
  private pendingTouchJustPressed = false;

  onScoreChange?: (s: number) => void;
  onStateChange?: (s: GameState) => void;
  onTimeChange?: (t: number) => void;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;
    this.ctx = config.canvas.getContext('2d')!;
    this.width = config.width;
    this.height = config.height;
    const dpr = config.dpr && config.dpr > 1 ? config.dpr : 1;
    this.canvas.width = Math.round(config.width * dpr);
    this.canvas.height = Math.round(config.height * dpr);
    if (dpr > 1) this.ctx.scale(dpr, dpr);
    this.rng = new SeededRNG(config.seed ?? Date.now());
    this.sound = new SoundEngine();
    this.input = {
      keys: new Set(),
      keysJustPressed: new Set(),
      keysJustReleased: new Set(),
      mouseX: 0,
      mouseY: 0,
      mouseDown: false,
      mouseJustPressed: false,
      mouseJustReleased: false,
      touches: [],
      touchJustPressed: false,
    };
    this.onScoreChange = config.onScoreChange;
    this.onStateChange = config.onStateChange;
    this.onTimeChange = config.onTimeChange;
    try {
      if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.reduceShake = true;
      }
    } catch {
      // ignore
    }
  }

  // --- Lifecycle ---
  start() {
    this.state = 'playing';
    this.score = 0;
    this.time = 0;
    this.particles = [];
    this.particlePool = [];
    this.moves = [];
    this.trauma = 0;
    this.shakeTime = 0;
    this.shakePower = 0;
    this.shakePhase = 0;
    this.freezeUntil = 0;
    this.lastTs = 0;
    this.pendingJustPressed.clear();
    this.pendingJustReleased.clear();
    this.pendingMouseJustPressed = false;
    this.pendingMouseJustReleased = false;
    this.pendingTouchJustPressed = false;
    this.sound.resume();
    this.emit();
    this.attachInput();
    window.addEventListener('blur', this.boundBlur);
    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.state = 'idle';
    this.detachInput();
    window.removeEventListener('blur', this.boundBlur);
    this.input.keys.clear();
    this.input.keysJustPressed.clear();
    this.input.keysJustReleased.clear();
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

  /** Edge: true if key went down since last frame */
  justPressed(key: string): boolean {
    return this.input.keysJustPressed.has(key);
  }

  /** True while key is held */
  held(key: string): boolean {
    return this.input.keys.has(key);
  }

  /** Any of the listed keys just pressed */
  justPressedAny(...keys: string[]): boolean {
    return keys.some((k) => this.input.keysJustPressed.has(k));
  }

  /** Any of the listed keys currently held */
  heldAny(...keys: string[]): boolean {
    return keys.some((k) => this.input.keys.has(k));
  }

  // --- Game loop ---
  private loop(ts: number) {
    if (this.state !== 'playing') return;
    // Hit-stop: freeze updates for a few ms (frame holds, feels punchy)
    if (this.freezeUntil > ts) {
      this.rafId = requestAnimationFrame(this.boundLoop);
      return;
    }
    if (this.lastTs === 0) this.lastTs = ts;
    const dt = Math.min(ts - this.lastTs, 50); // cap to avoid spiral
    this.lastTs = ts;
    this.time += dt;
    this.onTimeChange?.(this.time);

    // Promote pending edges → this-frame edges
    this.input.keysJustPressed.clear();
    this.input.keysJustReleased.clear();
    for (const k of this.pendingJustPressed) this.input.keysJustPressed.add(k);
    for (const k of this.pendingJustReleased) this.input.keysJustReleased.add(k);
    this.pendingJustPressed.clear();
    this.pendingJustReleased.clear();
    this.input.mouseJustPressed = this.pendingMouseJustPressed;
    this.input.mouseJustReleased = this.pendingMouseJustReleased;
    this.input.touchJustPressed = this.pendingTouchJustPressed;
    this.pendingMouseJustPressed = false;
    this.pendingMouseJustReleased = false;
    this.pendingTouchJustPressed = false;

    // Update particles + shake decay
    this.updateParticles(dt);
    this.updateShake(dt);

    // Game-specific update
    this.animFrame?.(dt);

    // Trauma shake transform (camera only — never bodies)
    const shakeAmt = this.reduceShake ? this.trauma * this.trauma * 0.35 : this.trauma * this.trauma;
    const hasShake = shakeAmt > 0.001;
    if (hasShake) {
      this.shakePhase += dt * 0.03;
      const maxOx = 14;
      const maxOy = 10;
      const shx = maxOx * shakeAmt * Math.sin(this.shakePhase * 1.7);
      const shy = maxOy * shakeAmt * Math.sin(this.shakePhase * 2.3);
      this.ctx.save();
      this.ctx.translate(this.width / 2, this.height / 2);
      this.ctx.scale(1.015, 1.015);
      this.ctx.translate(-this.width / 2 + shx, -this.height / 2 + shy);
    }

    // Clear & render
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderFrame?.();
    this.renderParticles();

    if (hasShake) this.ctx.restore();

    // Clear one-frame edges after game update+render
    this.input.keysJustPressed.clear();
    this.input.keysJustReleased.clear();
    this.input.mouseJustPressed = false;
    this.input.mouseJustReleased = false;
    this.input.touchJustPressed = false;

    this.rafId = requestAnimationFrame(this.boundLoop);
  }

  // --- Particles (pooled) ---
  private allocParticle(): Particle {
    const pooled = this.particlePool.pop();
    if (pooled) {
      pooled.active = true;
      return pooled;
    }
    return { x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 0.5, color: '#fff', size: 3, active: true };
  }

  private releaseParticle(p: Particle) {
    p.active = false;
    if (this.particlePool.length < MAX_PARTICLES) this.particlePool.push(p);
  }

  spawnParticle(x: number, y: number, color: string, count = 5) {
    const room = Math.max(0, MAX_PARTICLES - this.particles.length);
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) {
      const angle = this.rng.range(0, Math.PI * 2);
      const speed = this.rng.range(30, 120);
      const p = this.allocParticle();
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1;
      p.maxLife = this.rng.range(0.3, 0.8);
      p.color = color;
      p.size = this.rng.range(2, 6);
      this.particles.push(p);
    }
  }

  /** Add trauma (0..1). Hits ADD; they don't reset. */
  addTrauma(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Screen shake — call on hits/explosions (adds trauma + short legacy window) */
  shake(power: number, durationMs: number) {
    // Map legacy power (~2–10) into trauma 0..1
    this.addTrauma(Math.min(1, power / 12));
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, durationMs);
  }

  /** Hit-stop / freeze frames — call on impactful hits */
  hitStop(ms: number) {
    this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms);
  }

  /**
   * Layered feedback preset by importance tier.
   * small: soft collect; medium: hit/kill; large: death/boss/clear
   */
  feedback(tier: FeedbackTier, x?: number, y?: number, color = '#fbbf24') {
    const cx = x ?? this.width / 2;
    const cy = y ?? this.height / 2;
    switch (tier) {
      case 'small':
        this.sound.play('collect');
        this.spawnParticle(cx, cy, color, 4);
        this.addTrauma(0.08);
        break;
      case 'medium':
        this.sound.play('hit');
        this.spawnParticle(cx, cy, color, 8);
        this.addTrauma(0.22);
        this.hitStop(40);
        break;
      case 'large':
        this.sound.play('explosion');
        this.spawnParticle(cx, cy, color, 16);
        this.addTrauma(0.45);
        this.hitStop(70);
        break;
    }
  }

  private updateShake(dt: number) {
    const sDt = dt / 1000;
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * sDt);
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakePower = 0;
    }
  }

  private updateParticles(dt: number) {
    const sDt = dt / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * sDt;
      p.y += p.vy * sDt;
      p.life -= sDt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this.releaseParticle(p);
      }
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

  /** Map CSS-rect pointer coords → logical canvas coords */
  private scalePointer(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = r.width > 0 ? this.width / r.width : 1;
    const sy = r.height > 0 ? this.height / r.height : 1;
    return {
      x: (clientX - r.left) * sx,
      y: (clientY - r.top) * sy,
    };
  }

  /** Mobile / UI: simulate a key press (sets held + justPressed edge) */
  simulateKeyDown(key: string) {
    if (!this.input.keys.has(key)) {
      this.pendingJustPressed.add(key);
      this.logMove(`kd:${key}`);
    }
    this.input.keys.add(key);
  }

  /** Mobile / UI: simulate a key release */
  simulateKeyUp(key: string) {
    if (this.input.keys.has(key)) {
      this.pendingJustReleased.add(key);
    }
    this.input.keys.delete(key);
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
    if (e.repeat) return; // ignore OS key-repeat → edge only on first press
    const wasHeld = this.input.keys.has(e.key);
    this.input.keys.add(e.key);
    if (!wasHeld) {
      this.pendingJustPressed.add(e.key);
      this.logMove(`kd:${e.key}`);
    }
  }
  private onKeyUp(e: KeyboardEvent) {
    this.input.keys.delete(e.key);
    this.pendingJustReleased.add(e.key);
  }
  private onMouseDown(e: MouseEvent) {
    this.input.mouseDown = true;
    this.pendingMouseJustPressed = true;
    const p = this.scalePointer(e.clientX, e.clientY);
    this.input.mouseX = p.x;
    this.input.mouseY = p.y;
  }
  private onMouseUp() {
    this.input.mouseDown = false;
    this.pendingMouseJustReleased = true;
  }
  private onMouseMove(e: MouseEvent) {
    const p = this.scalePointer(e.clientX, e.clientY);
    this.input.mouseX = p.x;
    this.input.mouseY = p.y;
  }

  // Clear all held keys when the window loses focus (prevents "stuck" buttons)
  private onWindowBlur() {
    this.input.keys.clear();
    this.pendingJustPressed.clear();
    this.pendingJustReleased.clear();
  }
  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    this.pendingTouchJustPressed = true;
    this.input.touches = Array.from(e.touches).map((t) => {
      const p = this.scalePointer(t.clientX, t.clientY);
      return { x: p.x, y: p.y, id: t.identifier };
    });
    if (this.input.touches.length > 0) {
      this.input.mouseX = this.input.touches[0].x;
      this.input.mouseY = this.input.touches[0].y;
      this.input.mouseDown = true;
      this.pendingMouseJustPressed = true;
    }
  }
  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.input.touches = Array.from(e.touches).map((t) => {
      const p = this.scalePointer(t.clientX, t.clientY);
      return { x: p.x, y: p.y, id: t.identifier };
    });
    if (this.input.touches.length === 0) {
      this.input.mouseDown = false;
      this.pendingMouseJustReleased = true;
    }
  }
  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    this.input.touches = Array.from(e.touches).map((t) => {
      const p = this.scalePointer(t.clientX, t.clientY);
      return { x: p.x, y: p.y, id: t.identifier };
    });
    if (this.input.touches.length > 0) {
      this.input.mouseX = this.input.touches[0].x;
      this.input.mouseY = this.input.touches[0].y;
    }
  }

  private emit() {
    this.onStateChange?.(this.state);
  }
}
