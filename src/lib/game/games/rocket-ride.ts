// Rocket Ride — Endless runner
// Cat on rocket going up, dodge obstacles, collect green candles

import { GameEngine } from '../engine';

export function createRocketRide(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  const player = { x: W / 2, y: H - 100, vy: 0, vx: 0, tilt: 0 };
  const moveSpeed = 0.55;
  const BASE_ASCENT = 2.6;
  const TILT_MAX = 0.25;

  interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'fud' | 'bear' | 'cloud';
    speed: number;
    nearMissed: boolean;
  }

  interface Collectible {
    x: number;
    y: number;
    type: 'green' | 'boost';
    collected: boolean;
  }

  const obstacles: Obstacle[] = [];
  const collectibles: Collectible[] = [];
  let distance = 0;
  let lastDistanceScoreAt = 0; // once-per-threshold crossing
  let scrollSpeed = 2;
  let spawnTimer = 0;
  let collectibleTimer = 0;
  const stars: { x: number; y: number; size: number; speed: number }[] = [];
  let trail: { x: number; y: number; life: number; wobble: number }[] = [];
  let nearMissFlash = 0;
  let flamePhase = 0; // deterministic flame animation

  for (let i = 0; i < 80; i++) {
    stars.push({
      x: engine.rng.range(0, W),
      y: engine.rng.range(0, H),
      size: engine.rng.range(1, 3),
      speed: engine.rng.range(0.5, 2),
    });
  }

  function spawnObstacle() {
    const types: Obstacle['type'][] = ['fud', 'bear', 'cloud'];
    const type = types[engine.rng.intRange(0, types.length - 1)];
    const sizes: Record<string, { w: number; h: number }> = {
      fud: { w: 60, h: 30 },
      bear: { w: 40, h: 50 },
      cloud: { w: 80, h: 35 },
    };
    const s = sizes[type];
    obstacles.push({
      x: engine.rng.range(s.w / 2, W - s.w / 2),
      y: -50,
      w: s.w,
      h: s.h,
      type,
      speed: scrollSpeed,
      nearMissed: false,
    });
  }

  function spawnCollectible() {
    const type = engine.rng.next() > 0.15 ? 'green' : 'boost';
    collectibles.push({
      x: engine.rng.range(30, W - 30),
      y: -30,
      type,
      collected: false,
    });
  }

  engine.onUpdate((dt) => {
    const sDt = dt / 1000;
    const inp = engine.input;
    if (engine.justPressedAny('p', 'P')) { engine.pause(); return; }
    if (engine.justPressedAny('r', 'R')) { engine.stop(); engine.start(); return; }

    nearMissFlash = Math.max(0, nearMissFlash - sDt);
    flamePhase += sDt * 12;

    let targetVx = 0;
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) targetVx -= moveSpeed;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) targetVx += moveSpeed;
    player.vx += (targetVx - player.vx) * 0.28;

    player.y -= BASE_ASCENT * sDt * 60;
    player.y += Math.sin(engine.time / 420) * 0.55 * sDt * 60;
    player.vy = -BASE_ASCENT;

    player.x += player.vx;

    player.x = Math.max(20, Math.min(W - 20, player.x));
    player.y = Math.max(50, Math.min(H - 30, player.y));

    player.tilt += (Math.max(-TILT_MAX, Math.min(TILT_MAX, player.vx * 0.55)) - player.tilt) * 0.25;

    // Distance / score — once per 10m threshold crossing (no multi-fire on scroll jumps)
    distance += scrollSpeed;
    while (lastDistanceScoreAt + 10 <= distance) {
      lastDistanceScoreAt += 10;
      engine.addScore(1);
    }

    scrollSpeed = 2 + engine.time / 20000;

    // Deterministic trail (wobble baked at spawn, no rng in render)
    trail.push({
      x: player.x,
      y: player.y + 20,
      life: 1,
      wobble: Math.sin(engine.time * 0.02 + trail.length) * 3,
    });
    if (trail.length > 30) trail.shift();
    for (const t of trail) t.life -= sDt * 3;
    trail = trail.filter((t) => t.life > 0);

    for (const s of stars) {
      s.y += s.speed * scrollSpeed;
      if (s.y > H) { s.y = 0; s.x = engine.rng.range(0, W); }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(400, 1500 - engine.time / 50);
      spawnObstacle();
    }

    collectibleTimer -= dt;
    if (collectibleTimer <= 0) {
      collectibleTimer = Math.max(600, 2000 - engine.time / 30);
      spawnCollectible();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.speed;
      if (o.y > H + 50) { obstacles.splice(i, 1); continue; }

      const px = player.x;
      const py = player.y;
      const hitX = Math.abs(px - o.x) < (o.w / 2 + 12);
      const hitY = Math.abs(py - o.y) < (o.h / 2 + 15);

      if (hitX && hitY) {
        engine.sound.play('die');
        engine.spawnParticle(player.x, player.y, '#ef4444', 20);
        engine.shake(8, 250);
        engine.hitStop(100);
        engine.gameOver();
        return;
      }

      // Near-miss: close laterally, overlapping vertically band, not already counted
      const nearX = Math.abs(px - o.x) < (o.w / 2 + 28) && Math.abs(px - o.x) > (o.w / 2 + 12);
      const nearY = Math.abs(py - o.y) < (o.h / 2 + 10);
      if (!o.nearMissed && nearX && nearY) {
        o.nearMissed = true;
        engine.addScore(5);
        nearMissFlash = 0.45;
        engine.sound.play('shoot'); // whoosh-ish short beep
        engine.addTrauma(0.06);
        engine.logMove('near_miss', o.x, o.y);
      }
    }

    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.y += scrollSpeed;
      if (c.y > H + 30) { collectibles.splice(i, 1); continue; }

      if (!c.collected && Math.abs(player.x - c.x) < 20 && Math.abs(player.y - c.y) < 20) {
        c.collected = true;
        if (c.type === 'green') {
          engine.addScore(25);
          engine.sound.play('collect');
          engine.spawnParticle(c.x, c.y, '#22c55e', 8);
        } else {
          engine.addScore(100);
          engine.sound.play('powerup');
          engine.spawnParticle(c.x, c.y, '#a78bfa', 15);
          engine.shake(2, 80);
          scrollSpeed *= 0.7;
        }
        collectibles.splice(i, 1);
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.globalAlpha = s.size / 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Deterministic trail (no rng)
    for (const t of trail) {
      ctx.globalAlpha = t.life * 0.6;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(t.x + t.wobble, t.y, 4 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const o of obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.type === 'fud') {
        ctx.fillStyle = '#6b21a8';
        ctx.beginPath();
        ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUD', 0, 0);
      } else if (o.type === 'bear') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
        ctx.fillRect(-2, -o.h / 2 - 15, 4, 15);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐻', 0, 0);
      } else {
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.ellipse(-15, -10, o.w / 3, o.h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(15, -10, o.w / 3, o.h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const c of collectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.type === 'green') {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-6, -15, 12, 30);
        ctx.fillRect(-2, -22, 4, 7);
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#a78bfa';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 15;
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);

    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-8, 18);
    ctx.lineTo(8, 18);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();

    // Deterministic flame
    const flameH = 8 + (Math.sin(flamePhase) * 0.5 + 0.5) * 10;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-6, 18);
    ctx.lineTo(0, 18 + flameH);
    ctx.lineTo(6, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-3, 18);
    ctx.lineTo(0, 18 + flameH * 0.6);
    ctx.lineTo(3, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -5, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-6, -13);
    ctx.lineTo(-10, -22);
    ctx.lineTo(-1, -16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -13);
    ctx.lineTo(10, -22);
    ctx.lineTo(1, -16);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -7, 2, 0, Math.PI * 2);
    ctx.arc(3, -7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (nearMissFlash > 0) {
      ctx.fillStyle = `rgba(34, 211, 238, ${nearMissFlash * 0.9})`;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEAR MISS! +5', W / 2, player.y - 40);
    }

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Distance: ${Math.floor(distance)}m`, 20, 25);

    ctx.fillStyle = '#a78bfa';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Speed: ${scrollSpeed.toFixed(1)}x`, W - 20, 25);
  });
}
