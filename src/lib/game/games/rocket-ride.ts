// Rocket Ride — Endless runner
// Cat on rocket going UP the screen: world scrolls DOWN; player stays in lower band and steers L/R.

import { GameEngine } from '../engine';

export function createRocketRide(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  // Keep rocket in a playable band (classic runner feel — NOT flying into the ceiling)
  const PLAYER_Y = H * 0.72;
  const player = { x: W / 2, y: PLAYER_Y, vx: 0, tilt: 0, radius: 14 };
  const moveSpeed = 0.62;
  const TILT_MAX = 0.32;

  interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'fud' | 'bear' | 'cloud';
    nearMissed: boolean;
  }

  interface Collectible {
    x: number;
    y: number;
    type: 'green' | 'boost';
    collected: boolean;
    spin: number;
  }

  const obstacles: Obstacle[] = [];
  const collectibles: Collectible[] = [];
  let distance = 0;
  let lastDistanceScoreAt = 0;
  let scrollSpeed = 2.4;
  let spawnTimer = 0;
  let collectibleTimer = 0;
  let nearMissFlash = 0;
  let boostTimer = 0;
  let flamePhase = 0;
  let hitFlash = 0;

  const stars: { x: number; y: number; size: number; speed: number }[] = [];
  let trail: { x: number; y: number; life: number; wobble: number }[] = [];

  for (let i = 0; i < 90; i++) {
    stars.push({
      x: engine.rng.range(0, W),
      y: engine.rng.range(0, H),
      size: engine.rng.range(1, 2.8),
      speed: engine.rng.range(0.35, 1.8),
    });
  }

  function spawnObstacle() {
    const types: Obstacle['type'][] = ['fud', 'bear', 'cloud'];
    const type = types[engine.rng.intRange(0, types.length - 1)];
    const sizes: Record<Obstacle['type'], { w: number; h: number }> = {
      fud: { w: 70, h: 36 },
      bear: { w: 36, h: 56 },
      cloud: { w: 88, h: 38 },
    };
    const s = sizes[type];
    // Avoid spawning directly on player lane too often
    let x = engine.rng.range(s.w / 2 + 8, W - s.w / 2 - 8);
    if (engine.rng.next() < 0.35) {
      x = player.x + engine.rng.range(-120, 120);
      x = Math.max(s.w / 2 + 8, Math.min(W - s.w / 2 - 8, x));
    }
    obstacles.push({
      x,
      y: -40 - s.h / 2,
      w: s.w,
      h: s.h,
      type,
      nearMissed: false,
    });
  }

  function spawnCollectible() {
    const type = engine.rng.next() > 0.18 ? 'green' : 'boost';
    collectibles.push({
      x: engine.rng.range(28, W - 28),
      y: -28,
      type,
      collected: false,
      spin: engine.rng.range(0, Math.PI * 2),
    });
  }

  engine.onUpdate((dt) => {
    const sDt = dt / 1000;
    const inp = engine.input;
    if (engine.justPressedAny('p', 'P')) {
      engine.pause();
      return;
    }
    if (engine.justPressedAny('r', 'R')) {
      engine.stop();
      engine.start();
      return;
    }

    nearMissFlash = Math.max(0, nearMissFlash - sDt);
    hitFlash = Math.max(0, hitFlash - sDt);
    boostTimer = Math.max(0, boostTimer - sDt);
    flamePhase += sDt * 14;

    // Steer — keyboard + held, and optional pointer pull
    let targetVx = 0;
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a') || inp.keys.has('A')) targetVx -= moveSpeed;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d') || inp.keys.has('D')) targetVx += moveSpeed;

    // Touch/mouse: drag toward pointer X while playing (helps mobile beyond D-pad)
    if (inp.mouse.down || inp.touches.length > 0) {
      const px = inp.touches.length > 0 ? inp.touches[0].x : inp.mouse.x;
      const dx = px - player.x;
      if (Math.abs(dx) > 8) targetVx += Math.max(-moveSpeed, Math.min(moveSpeed, dx * 0.012));
    }

    const speedMul = boostTimer > 0 ? 1.25 : 1;
    player.vx += (targetVx * speedMul - player.vx) * 0.32;
    player.x += player.vx * sDt * 60;
    player.x = Math.max(player.radius + 4, Math.min(W - player.radius - 4, player.x));
    // Soft bob only — stay in band
    player.y = PLAYER_Y + Math.sin(engine.time / 380) * 6;
    player.tilt += (Math.max(-TILT_MAX, Math.min(TILT_MAX, player.vx * 0.5)) - player.tilt) * 0.28;

    // World scroll (dt-based). Distance in "meters".
    const scroll = scrollSpeed * sDt * 60;
    distance += scroll;
    while (lastDistanceScoreAt + 10 <= distance) {
      lastDistanceScoreAt += 10;
      engine.addScore(1);
    }
    // Difficulty ramp
    scrollSpeed = 2.4 + Math.min(4.5, engine.time / 18000) + (boostTimer > 0 ? 0.6 : 0);

    // Trail
    trail.push({
      x: player.x,
      y: player.y + 18,
      life: 1,
      wobble: Math.sin(engine.time * 0.025 + trail.length * 0.7) * 2.5,
    });
    if (trail.length > 36) trail.shift();
    for (const t of trail) t.life -= sDt * 2.8;
    trail = trail.filter((t) => t.life > 0);

    for (const s of stars) {
      s.y += s.speed * scroll;
      if (s.y > H) {
        s.y = -2;
        s.x = engine.rng.range(0, W);
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(380, 1350 - engine.time / 55);
      spawnObstacle();
      if (engine.time > 25000 && engine.rng.next() < 0.28) spawnObstacle();
    }

    collectibleTimer -= dt;
    if (collectibleTimer <= 0) {
      collectibleTimer = Math.max(520, 1700 - engine.time / 40);
      spawnCollectible();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += scroll;
      if (o.y > H + 60) {
        obstacles.splice(i, 1);
        continue;
      }

      const hitPad = 10;
      const hitX = Math.abs(player.x - o.x) < o.w / 2 + player.radius - hitPad;
      const hitY = Math.abs(player.y - o.y) < o.h / 2 + player.radius - hitPad;

      if (hitX && hitY) {
        engine.sound.play('die');
        engine.spawnParticle(player.x, player.y, '#ef4444', 24);
        engine.feedback('heavy');
        engine.gameOver();
        return;
      }

      // Near-miss corridor
      const nearX =
        Math.abs(player.x - o.x) < o.w / 2 + player.radius + 18 &&
        Math.abs(player.x - o.x) > o.w / 2 + player.radius - hitPad;
      const nearY = Math.abs(player.y - o.y) < o.h / 2 + 8;
      if (!o.nearMissed && nearX && nearY && o.y > player.y - 40) {
        o.nearMissed = true;
        engine.addScore(5);
        nearMissFlash = 0.55;
        engine.sound.play('shoot');
        engine.addTrauma(0.08);
        engine.spawnParticle(player.x, player.y - 10, '#22d3ee', 6);
        engine.logMove('near_miss', o.x, o.y);
      }
    }

    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.y += scroll;
      c.spin += sDt * 4;
      if (c.y > H + 40) {
        collectibles.splice(i, 1);
        continue;
      }
      if (!c.collected && Math.hypot(player.x - c.x, player.y - c.y) < 26) {
        c.collected = true;
        if (c.type === 'green') {
          engine.addScore(25);
          engine.sound.play('collect');
          engine.spawnParticle(c.x, c.y, '#22c55e', 10);
          engine.feedback('light');
        } else {
          engine.addScore(80);
          engine.sound.play('powerup');
          engine.spawnParticle(c.x, c.y, '#a78bfa', 16);
          engine.feedback('medium');
          boostTimer = 2.2;
        }
        collectibles.splice(i, 1);
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    // Space gradient + subtle nebula bands
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050514');
    grad.addColorStop(0.45, '#12082a');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (const s of stars) {
      ctx.globalAlpha = 0.35 + (s.size / 3) * 0.65;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Exhaust trail
    for (const t of trail) {
      ctx.globalAlpha = t.life * 0.55;
      const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 7 * t.life);
      g.addColorStop(0, '#fdba74');
      g.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x + t.wobble, t.y, 6 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Obstacles — drawn shapes (no emoji)
    for (const o of obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.type === 'fud') {
        const fog = ctx.createRadialGradient(0, 0, 4, 0, 0, o.w / 2);
        fog.addColorStop(0, 'rgba(168,85,247,0.95)');
        fog.addColorStop(1, 'rgba(88,28,135,0.15)');
        ctx.fillStyle = fog;
        ctx.beginPath();
        ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUD', 0, 1);
      } else if (o.type === 'bear') {
        // Red bearish candle body + wick
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-o.w / 2, -o.h / 2 + 8, o.w, o.h - 8);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(-2, -o.h / 2 - 6, 4, 14);
        ctx.fillRect(-2, o.h / 2 - 2, 4, 10);
        ctx.fillStyle = '#fee2e2';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BEAR', 0, 4);
      } else {
        ctx.fillStyle = '#4b5563';
        ctx.beginPath();
        ctx.ellipse(0, 4, o.w / 2, o.h / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.ellipse(-18, -6, o.w / 3.2, o.h / 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -4, o.w / 3.4, o.h / 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SMOKE', 0, 6);
      }
      ctx.restore();
    }

    // Collectibles
    for (const c of collectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.sin(c.spin) * 0.15);
      if (c.type === 'green') {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-7, -16, 14, 32);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-5, -14, 10, 10);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-2, -22, 4, 8);
      } else {
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ede9fe';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOOST', 0, 0);
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Rocket + cat
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);
    if (hitFlash > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(hitFlash * 40);

    // Body
    const body = ctx.createLinearGradient(0, -22, 0, 20);
    body.addColorStop(0, '#e5e7eb');
    body.addColorStop(0.5, '#9ca3af');
    body.addColorStop(1, '#4b5563');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-11, 6);
    ctx.lineTo(-9, 20);
    ctx.lineTo(9, 20);
    ctx.lineTo(11, 6);
    ctx.closePath();
    ctx.fill();

    // Window
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fins
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-9, 8);
    ctx.lineTo(-18, 22);
    ctx.lineTo(-8, 18);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.lineTo(18, 22);
    ctx.lineTo(8, 18);
    ctx.fill();

    // Flame (deterministic)
    const flameH = 10 + (Math.sin(flamePhase) * 0.5 + 0.5) * 14 + (boostTimer > 0 ? 8 : 0);
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-7, 20);
    ctx.lineTo(0, 20 + flameH);
    ctx.lineTo(7, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(-3.5, 20);
    ctx.lineTo(0, 20 + flameH * 0.55);
    ctx.lineTo(3.5, 20);
    ctx.closePath();
    ctx.fill();

    // Cat head on nose
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, -18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, -24);
    ctx.lineTo(-9, -32);
    ctx.lineTo(-1, -26);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(5, -24);
    ctx.lineTo(9, -32);
    ctx.lineTo(1, -26);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-3, -19, 1.6, 0, Math.PI * 2);
    ctx.arc(3, -19, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;

    if (boostTimer > 0) {
      ctx.fillStyle = 'rgba(167,139,250,0.25)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOOST!', W / 2, 48);
    }

    if (nearMissFlash > 0) {
      ctx.fillStyle = `rgba(34, 211, 238, ${Math.min(1, nearMissFlash * 1.4)})`;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEAR MISS! +5', W / 2, player.y - 48);
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10, 8, 160, 44);
    ctx.fillRect(W - 150, 8, 140, 44);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(distance)}m`, 20, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('DISTANCE', 20, 44);
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${scrollSpeed.toFixed(1)}x`, W - 20, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('SPEED', W - 20, 44);

    // Steer hint once early
    if (engine.time < 3500) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('← →  steer   ·   collect green · dodge FUD', W / 2, H - 18);
    }
  });
}
