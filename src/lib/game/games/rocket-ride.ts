// Rocket Ride — Endless runner (fix-in-place improve; keep ALL controls useful)
// World scrolls down; ship stays in playable band. Full pad: L/R steer, U/D lane, A boost, B brake.

import { GameEngine } from '../engine';

export function createRocketRide(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  const BAND_MIN = H * 0.58;
  const BAND_MAX = H * 0.82;
  const PLAYER_Y0 = H * 0.72;
  const player = {
    x: W / 2,
    y: PLAYER_Y0,
    vx: 0,
    vy: 0,
    tilt: 0,
    radius: 14,
    squash: 1,
  };
  const moveSpeed = 0.68;
  const TILT_MAX = 0.38;

  interface Obstacle {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'fud' | 'bear' | 'cloud';
    nearMissed: boolean;
    pulse: number;
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
  let nearMissStreak = 0;
  let boostTimer = 0;
  let brakeTimer = 0;
  let flamePhase = 0;
  let hitStop = 0;
  let lanePulse = 0;

  const starsFar: { x: number; y: number; size: number; speed: number }[] = [];
  const starsNear: { x: number; y: number; size: number; speed: number }[] = [];
  let trail: { x: number; y: number; life: number; wobble: number }[] = [];

  for (let i = 0; i < 55; i++) {
    starsFar.push({
      x: engine.rng.range(0, W),
      y: engine.rng.range(0, H),
      size: engine.rng.range(0.8, 1.8),
      speed: engine.rng.range(0.2, 0.7),
    });
  }
  for (let i = 0; i < 40; i++) {
    starsNear.push({
      x: engine.rng.range(0, W),
      y: engine.rng.range(0, H),
      size: engine.rng.range(1.4, 3.0),
      speed: engine.rng.range(0.9, 2.2),
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
    let x = engine.rng.range(s.w / 2 + 8, W - s.w / 2 - 8);
    if (engine.rng.next() < 0.38) {
      x = player.x + engine.rng.range(-130, 130);
      x = Math.max(s.w / 2 + 8, Math.min(W - s.w / 2 - 8, x));
    }
    obstacles.push({
      x,
      y: -40 - s.h / 2,
      w: s.w,
      h: s.h,
      type,
      nearMissed: false,
      pulse: engine.rng.range(0, Math.PI * 2),
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
    if (hitStop > 0) {
      hitStop -= dt;
      return;
    }
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
    boostTimer = Math.max(0, boostTimer - sDt);
    brakeTimer = Math.max(0, brakeTimer - sDt);
    lanePulse = Math.max(0, lanePulse - sDt);
    flamePhase += sDt * (boostTimer > 0 ? 20 : 14);
    player.squash += (1 - player.squash) * Math.min(1, sDt * 10);

    // A / Space / Z = boost burst (edge or hold refreshes)
    if (engine.justPressedAny('z', ' ', 'Z')) {
      boostTimer = Math.max(boostTimer, 1.6);
      brakeTimer = 0;
      player.squash = 0.78;
      engine.sound.play('powerup');
      engine.feedback('medium', player.x, player.y, '#a78bfa');
      engine.logMove('boost', player.x, player.y);
    }
    // B / X / Enter = brake for precision dodge
    if (engine.justPressedAny('x', 'X', 'Enter')) {
      brakeTimer = Math.max(brakeTimer, 1.1);
      boostTimer = Math.min(boostTimer, 0.15);
      player.squash = 1.18;
      engine.sound.play('shoot');
      engine.addTrauma(0.04);
      engine.logMove('brake', player.x, player.y);
    }

    // Steer L/R
    let targetVx = 0;
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a') || inp.keys.has('A')) targetVx -= moveSpeed;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d') || inp.keys.has('D')) targetVx += moveSpeed;

    // U/D nudge within band (lane bob)
    let targetVy = 0;
    if (inp.keys.has('ArrowUp') || inp.keys.has('w') || inp.keys.has('W')) {
      targetVy -= 0.42;
      lanePulse = 0.25;
    }
    if (inp.keys.has('ArrowDown') || inp.keys.has('s') || inp.keys.has('S')) {
      targetVy += 0.42;
      lanePulse = 0.25;
    }

    // Drag / touch aim
    if (inp.mouseDown || inp.touches.length > 0) {
      const px = inp.touches.length > 0 ? inp.touches[0].x : inp.mouseX;
      const py = inp.touches.length > 0 ? inp.touches[0].y : inp.mouseY;
      const dx = px - player.x;
      const dy = py - player.y;
      if (Math.abs(dx) > 8) targetVx += Math.max(-moveSpeed, Math.min(moveSpeed, dx * 0.012));
      if (Math.abs(dy) > 12) targetVy += Math.max(-0.42, Math.min(0.42, dy * 0.008));
    }

    const speedMul = boostTimer > 0 ? 1.28 : brakeTimer > 0 ? 0.72 : 1;
    player.vx += (targetVx * speedMul - player.vx) * 0.34;
    player.vy += (targetVy - player.vy) * 0.28;
    player.x += player.vx * sDt * 60;
    player.y += player.vy * sDt * 60;
    // Soft settle toward band center when idle
    if (Math.abs(targetVy) < 0.01) {
      player.y += (PLAYER_Y0 + Math.sin(engine.time / 380) * 5 - player.y) * 0.04;
    }
    player.x = Math.max(player.radius + 4, Math.min(W - player.radius - 4, player.x));
    player.y = Math.max(BAND_MIN, Math.min(BAND_MAX, player.y));
    player.tilt += (Math.max(-TILT_MAX, Math.min(TILT_MAX, player.vx * 0.55)) - player.tilt) * 0.3;

    // World scroll
    let scrollMul = 1 + Math.min(1.8, engine.time / 22000);
    if (boostTimer > 0) scrollMul += 0.35;
    if (brakeTimer > 0) scrollMul *= 0.55;
    scrollSpeed = 2.4 * scrollMul;
    const scroll = scrollSpeed * sDt * 60;
    distance += scroll;
    while (lastDistanceScoreAt + 10 <= distance) {
      lastDistanceScoreAt += 10;
      engine.addScore(1);
    }

    trail.push({
      x: player.x,
      y: player.y + 18,
      life: 1,
      wobble: Math.sin(engine.time * 0.025 + trail.length * 0.7) * 2.5,
    });
    if (trail.length > 42) trail.shift();
    for (const t of trail) t.life -= sDt * 2.8;
    trail = trail.filter((t) => t.life > 0);

    for (const s of starsFar) {
      s.y += s.speed * scroll * 0.45;
      if (s.y > H) {
        s.y = -2;
        s.x = engine.rng.range(0, W);
      }
    }
    for (const s of starsNear) {
      s.y += s.speed * scroll;
      if (s.y > H) {
        s.y = -2;
        s.x = engine.rng.range(0, W);
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(360, 1300 - engine.time / 55);
      spawnObstacle();
      if (engine.time > 22000 && engine.rng.next() < 0.3) spawnObstacle();
    }

    collectibleTimer -= dt;
    if (collectibleTimer <= 0) {
      collectibleTimer = Math.max(500, 1650 - engine.time / 40);
      spawnCollectible();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += scroll;
      o.pulse += sDt * 3;
      if (o.y > H + 60) {
        obstacles.splice(i, 1);
        continue;
      }

      const hitPad = 10;
      const hitX = Math.abs(player.x - o.x) < o.w / 2 + player.radius - hitPad;
      const hitY = Math.abs(player.y - o.y) < o.h / 2 + player.radius - hitPad;

      if (hitX && hitY) {
        hitStop = 90;
        engine.sound.play('die');
        engine.spawnParticle(player.x, player.y, '#ef4444', 28);
        engine.feedback('large', player.x, player.y, '#ef4444');
        engine.gameOver();
        return;
      }

      const nearX =
        Math.abs(player.x - o.x) < o.w / 2 + player.radius + 18 &&
        Math.abs(player.x - o.x) > o.w / 2 + player.radius - hitPad;
      const nearY = Math.abs(player.y - o.y) < o.h / 2 + 10;
      if (!o.nearMissed && nearX && nearY && o.y > player.y - 48) {
        o.nearMissed = true;
        nearMissStreak += 1;
        const bonus = 5 + Math.min(15, nearMissStreak * 2);
        engine.addScore(bonus);
        nearMissFlash = 0.55;
        engine.sound.play('shoot');
        engine.addTrauma(0.07 + Math.min(0.08, nearMissStreak * 0.01));
        engine.spawnParticle(player.x, player.y - 10, '#22d3ee', 6 + Math.min(8, nearMissStreak));
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
        nearMissStreak = Math.max(0, nearMissStreak - 1);
        if (c.type === 'green') {
          engine.addScore(25);
          engine.sound.play('collect');
          engine.spawnParticle(c.x, c.y, '#22c55e', 12);
          engine.feedback('small', c.x, c.y, '#22c55e');
        } else {
          engine.addScore(80);
          engine.sound.play('powerup');
          engine.spawnParticle(c.x, c.y, '#a78bfa', 18);
          engine.feedback('medium', c.x, c.y, '#a78bfa');
          boostTimer = Math.max(boostTimer, 2.2);
          player.squash = 0.75;
        }
        collectibles.splice(i, 1);
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050514');
    grad.addColorStop(0.4, '#12082a');
    grad.addColorStop(0.75, '#1a0a2e');
    grad.addColorStop(1, '#2a1040');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Far stars
    for (const s of starsFar) {
      ctx.globalAlpha = 0.25 + (s.size / 3) * 0.4;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    // Near stars
    for (const s of starsNear) {
      ctx.globalAlpha = 0.4 + (s.size / 3) * 0.55;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft lane band hint
    if (lanePulse > 0 || engine.time < 4000) {
      ctx.fillStyle = `rgba(56, 189, 248, ${0.04 + lanePulse * 0.08})`;
      ctx.fillRect(0, BAND_MIN, W, BAND_MAX - BAND_MIN);
    }

    for (const t of trail) {
      ctx.globalAlpha = t.life * 0.55;
      const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 8 * t.life);
      g.addColorStop(0, boostTimer > 0 ? '#c4b5fd' : '#fdba74');
      g.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x + t.wobble, t.y, 6 * t.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const o of obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      const wob = Math.sin(o.pulse) * 1.5;
      if (o.type === 'fud') {
        const fog = ctx.createRadialGradient(0, wob, 4, 0, wob, o.w / 2);
        fog.addColorStop(0, 'rgba(168,85,247,0.95)');
        fog.addColorStop(1, 'rgba(88,28,135,0.12)');
        ctx.fillStyle = fog;
        ctx.beginPath();
        ctx.ellipse(0, wob, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUD', 0, wob + 1);
      } else if (o.type === 'bear') {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(-o.w / 2 - 2, -o.h / 2 + 10, o.w + 4, o.h - 6);
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
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.ellipse(0, 4 + wob, o.w / 2, o.h / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.ellipse(-18, -6 + wob, o.w / 3.2, o.h / 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, -4 + wob, o.w / 3.4, o.h / 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d1d5db';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SMOKE', 0, 6 + wob);
      }
      ctx.restore();
    }

    for (const c of collectibles) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(Math.sin(c.spin) * 0.15);
      if (c.type === 'green') {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-7, -16, 14, 32);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-5, -14, 10, 10);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-2, -22, 4, 8);
      } else {
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 18;
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

    // Rocket
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.tilt);
    ctx.scale(2 - player.squash, player.squash);

    const body = ctx.createLinearGradient(0, -22, 0, 20);
    body.addColorStop(0, '#f8fafc');
    body.addColorStop(0.45, '#cbd5e1');
    body.addColorStop(1, '#64748b');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(-11, 6);
    ctx.lineTo(-9, 20);
    ctx.lineTo(9, 20);
    ctx.lineTo(11, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.stroke();

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

    const flameH = 10 + (Math.sin(flamePhase) * 0.5 + 0.5) * 14 + (boostTimer > 0 ? 10 : 0) - (brakeTimer > 0 ? 6 : 0);
    ctx.fillStyle = boostTimer > 0 ? '#a78bfa' : '#f97316';
    ctx.beginPath();
    ctx.moveTo(-7, 20);
    ctx.lineTo(0, 20 + Math.max(4, flameH));
    ctx.lineTo(7, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(-3.5, 20);
    ctx.lineTo(0, 20 + Math.max(2, flameH * 0.55));
    ctx.lineTo(3.5, 20);
    ctx.closePath();
    ctx.fill();

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

    if (boostTimer > 0) {
      ctx.fillStyle = 'rgba(167,139,250,0.18)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOOST', W / 2, 48);
    }
    if (brakeTimer > 0) {
      ctx.fillStyle = 'rgba(168,85,247,0.12)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BRAKE', W / 2, 48);
    }

    if (nearMissFlash > 0) {
      ctx.fillStyle = `rgba(34, 211, 238, ${Math.min(1, nearMissFlash * 1.4)})`;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      const streakTxt = nearMissStreak > 1 ? ` x${nearMissStreak}` : '';
      ctx.fillText(`NEAR MISS!${streakTxt}`, W / 2, player.y - 48);
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(10, 8, 150, 52);
    ctx.fillRect(W - 150, 8, 140, 52);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(distance)}m`, 20, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('DISTANCE', 20, 44);
    if (nearMissStreak > 0) {
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`STREAK ${nearMissStreak}`, 20, 56);
    }
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${scrollSpeed.toFixed(1)}x`, W - 20, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('SPEED', W - 20, 44);

    if (engine.time < 4500) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('←→ steer  ↑↓ lane  A boost  B brake', W / 2, H - 18);
    }
  });
}
