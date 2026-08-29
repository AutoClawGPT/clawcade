// Rocket Ride — Endless runner
// Cat on rocket going up, dodge obstacles, collect green candles

import { GameEngine } from '../engine';

export function createRocketRide(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  const player = { x: W / 2, y: H - 100, vy: 0, vx: 0, tilt: 0 };
  const gravity = 0.15;
  const thrust = -0.6;
  const moveSpeed = 0.3;

  interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'fud' | 'bear' | 'cloud';
    speed: number;
  }

  interface Collectible {
    x: number;
    y: number;
    type: 'green' | 'boost';
    collected: boolean;
  }

  let obstacles: Obstacle[] = [];
  let collectibles: Collectible[] = [];
  let distance = 0;
  let scrollSpeed = 2;
  let spawnTimer = 0;
  let collectibleTimer = 0;
  let stars: { x: number; y: number; size: number; speed: number }[] = [];
  let trail: { x: number; y: number; life: number }[] = [];

  // Init stars
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
    if (inp.keys.has('p') || inp.keys.has('P')) { engine.pause(); return; }
    if (inp.keys.has('r') || inp.keys.has('R')) { engine.stop(); engine.start(); return; }

    // Controls
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) player.vx -= moveSpeed;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) player.vx += moveSpeed;

    // Apply thrust (always going up)
    player.vy += thrust * 0.3 + gravity;
    player.vy = Math.max(-8, Math.min(4, player.vy));

    // Apply horizontal
    player.vx *= 0.92; // friction
    player.x += player.vx;
    player.y += player.vy;

    // Bounds
    player.x = Math.max(20, Math.min(W - 20, player.x));
    player.y = Math.max(50, Math.min(H - 30, player.y));

    // Tilt
    player.tilt = player.vx * 0.08;

    // Distance / score
    distance += scrollSpeed;
    if (Math.floor(distance) % 10 === 0) engine.addScore(1);

    // Speed up
    scrollSpeed = 2 + engine.time / 20000;

    // Trail
    trail.push({ x: player.x, y: player.y + 20, life: 1 });
    if (trail.length > 30) trail.shift();
    for (const t of trail) t.life -= sDt * 3;
    trail = trail.filter((t) => t.life > 0);

    // Stars
    for (const s of stars) {
      s.y += s.speed * scrollSpeed;
      if (s.y > H) { s.y = 0; s.x = engine.rng.range(0, W); }
    }

    // Spawn obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(400, 1500 - engine.time / 50);
      spawnObstacle();
    }

    // Spawn collectibles
    collectibleTimer -= dt;
    if (collectibleTimer <= 0) {
      collectibleTimer = Math.max(600, 2000 - engine.time / 30);
      spawnCollectible();
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += o.speed;
      if (o.y > H + 50) { obstacles.splice(i, 1); continue; }

      // Collision
      const px = player.x;
      const py = player.y;
      if (Math.abs(px - o.x) < (o.w / 2 + 12) && Math.abs(py - o.y) < (o.h / 2 + 15)) {
        engine.sound.play('die');
        engine.spawnParticle(player.x, player.y, '#ef4444', 20);
        engine.gameOver();
        return;
      }
    }

    // Update collectibles
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
          // Brief speed reduction (easier)
          scrollSpeed *= 0.7;
        }
        collectibles.splice(i, 1);
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.globalAlpha = s.size / 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Trail
    for (const t of trail) {
      ctx.globalAlpha = t.life * 0.6;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(t.x + engine.rng.range(-3, 3), t.y, 4 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Obstacles
    for (const o of obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.type === 'fud') {
        // FUD cloud
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
        // Bear candle (red)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
        // Wick
        ctx.fillRect(-2, -o.h / 2 - 15, 4, 15);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐻', 0, 0);
      } else {
        // Cloud
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

    // Collectibles
    for (const c of collectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);
      if (c.type === 'green') {
        // Green candle
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-6, -15, 12, 30);
        ctx.fillRect(-2, -22, 4, 7);
        // Glow
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
      } else {
        // Boost diamond
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

    // Player (cat on rocket)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);

    // Rocket body
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-8, 18);
    ctx.lineTo(8, 18);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();

    // Rocket flames
    const flameH = 8 + Math.random() * 10;
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

    // Cat on rocket
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -5, 10, 0, Math.PI * 2);
    ctx.fill();

    // Ears
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

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-3, -7, 2, 0, Math.PI * 2);
    ctx.arc(3, -7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HUD
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
