// Swarm — Survival game
// Player in center, enemies swarm from edges, auto-attack nearest

import { GameEngine } from '../engine';

export function createSwarm(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  const player = {
    x: W / 2,
    y: H / 2,
    r: 15,
    speed: 3,
    attackCd: 0,
    attackRange: 80,
    hp: 5,
    maxHp: 5,
    iFrames: 0,
  };
  interface Enemy { x: number; y: number; r: number; speed: number; hp: number; color: string; flash: number }
  const enemies: Enemy[] = [];
  const projectiles: { x: number; y: number; vx: number; vy: number; life: number; dmg: number }[] = [];
  let kills = 0;
  let spawnTimer = 0;
  let difficulty = 1;
  let level = 1;
  let xp = 0;
  let xpToNext = 10;
  let weaponLevel = 1;
  let levelUpFlash = 0;
  let levelUpAura = 0;

  function spawnEnemy() {
    const side = engine.rng.intRange(0, 3);
    let x: number, y: number;
    if (side === 0) { x = engine.rng.range(0, W); y = -20; }
    else if (side === 1) { x = W + 20; y = engine.rng.range(0, H); }
    else if (side === 2) { x = engine.rng.range(0, W); y = H + 20; }
    else { x = -20; y = engine.rng.range(0, H); }

    const types = [
      { r: 8, speed: 1.2, hp: 1, color: '#ef4444' },
      { r: 10, speed: 0.8, hp: 3, color: '#dc2626' },
      { r: 14, speed: 0.6, hp: 5, color: '#b91c1c' },
      { r: 6, speed: 2, hp: 1, color: '#f97316' },
    ];
    const t = types[Math.min(engine.rng.intRange(0, types.length - 1), types.length - 1)];
    enemies.push({
      x, y,
      r: t.r,
      speed: t.speed * (1 + difficulty * 0.1),
      hp: Math.ceil(t.hp * (1 + difficulty * 0.2)),
      color: t.color,
      flash: 0,
    });
  }

  function tryLevelUp() {
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level++;
      weaponLevel = Math.min(5, Math.floor(level / 2) + 1);
      player.attackRange = 80 + level * 5;
      xpToNext = Math.floor(10 * Math.pow(1.45, level - 1));
      levelUpFlash = 1.2;
      levelUpAura = 1.5;
      engine.sound.play('powerup');
      engine.spawnParticle(player.x, player.y, '#a78bfa', 18);
      engine.addTrauma(0.25);
      engine.hitStop(50);
    }
  }

  engine.onUpdate((dt) => {
    const sDt = dt / 1000;
    const inp = engine.input;
    if (engine.justPressedAny('p', 'P')) { engine.pause(); return; }
    if (engine.justPressedAny('r', 'R')) { engine.stop(); engine.start(); return; }

    levelUpFlash = Math.max(0, levelUpFlash - sDt);
    levelUpAura = Math.max(0, levelUpAura - sDt);
    player.iFrames = Math.max(0, player.iFrames - dt);

    // Player movement
    let dx = 0, dy = 0;
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) dx -= 1;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) dx += 1;
    if (inp.keys.has('ArrowUp') || inp.keys.has('w')) dy -= 1;
    if (inp.keys.has('ArrowDown') || inp.keys.has('s')) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / len) * player.speed;
      player.y += (dy / len) * player.speed;
    }
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));

    // Auto-attack nearest enemy
    player.attackCd -= dt;
    if (player.attackCd <= 0 && enemies.length > 0) {
      let nearest: Enemy | null = null;
      let nearDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearDist) { nearDist = d; nearest = e; }
      }
      if (nearest && nearDist < player.attackRange + nearest.r) {
        const projCount = Math.min(weaponLevel, 5);
        for (let i = 0; i < projCount; i++) {
          const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x) + (i - (projCount - 1) / 2) * 0.15;
          projectiles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            life: 1.5,
            dmg: 1,
          });
        }
        player.attackCd = Math.max(100, 300 - weaponLevel * 20);
        engine.sound.play('shoot');
      }
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= sDt;
      if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        projectiles.splice(i, 1);
        continue;
      }
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 4) {
          e.hp -= p.dmg;
          e.flash = 0.1;
          engine.spawnParticle(e.x, e.y, e.color, 3);
          projectiles.splice(i, 1);
          if (e.hp <= 0) {
            kills++;
            xp += 1;
            engine.addScore(10);
            engine.feedback('small', e.x, e.y, e.color);
            engine.sound.play('explosion');
            enemies.splice(j, 1);
            tryLevelUp();
          }
          break;
        }
      }
    }

    // Spawn enemies
    spawnTimer -= dt;
    difficulty = 1 + engine.time / 30000;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(200, 1500 - engine.time / 100);
      const count = Math.floor(1 + difficulty * 0.5);
      const cap = 40;
      for (let i = 0; i < count && enemies.length < cap; i++) spawnEnemy();
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const edx = player.x - e.x;
      const edy = player.y - e.y;
      const dist = Math.sqrt(edx * edx + edy * edy);
      if (dist > 0) {
        e.x += (edx / dist) * e.speed;
        e.y += (edy / dist) * e.speed;
      }
      e.flash = Math.max(0, e.flash - sDt);

      // Hit player — real HP + i-frames
      if (dist < player.r + e.r && player.iFrames <= 0) {
        player.hp -= 1;
        player.iFrames = 1000;
        engine.sound.play('hit');
        engine.spawnParticle(player.x, player.y, '#fbbf24', 8);
        engine.shake(5, 140);
        engine.hitStop(60);
        enemies.splice(i, 1);
        if (player.hp <= 0) {
          engine.gameOver();
          return;
        }
      }
    }

    // Score = time survived (causal)
    if (Math.floor(engine.time / 1000) > Math.floor((engine.time - dt) / 1000)) {
      engine.addScore(1);
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.fillStyle = '#22d3ee';
    for (const p of projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of enemies) {
      ctx.save();
      if (e.flash > 0) ctx.globalAlpha = 0.5;
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.2, e.r * 0.2, 0, Math.PI * 2);
      ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.2, e.r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Level-up aura
    if (levelUpAura > 0) {
      ctx.strokeStyle = `rgba(167, 139, 250, ${Math.min(1, levelUpAura)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 10 + (1.5 - levelUpAura) * 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player (blink during i-frames)
    ctx.save();
    if (player.iFrames > 0 && Math.floor(player.iFrames / 80) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(player.x - 8, player.y - 12);
    ctx.lineTo(player.x - 14, player.y - 24);
    ctx.lineTo(player.x - 1, player.y - 15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(player.x + 8, player.y - 12);
    ctx.lineTo(player.x + 14, player.y - 24);
    ctx.lineTo(player.x + 1, player.y - 15);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x - 4, player.y - 3, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 4, player.y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#22d3ee33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.attackRange, 0, Math.PI * 2);
    ctx.stroke();

    // HUD
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Kills: ${kills}`, 20, 20);
    ctx.fillText(`Level: ${level}`, 20, 40);
    ctx.fillText(`Weapon: Lv${weaponLevel}`, 20, 60);

    // Hearts
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`HP: ${'❤'.repeat(Math.max(0, player.hp))}${'♡'.repeat(Math.max(0, player.maxHp - player.hp))}`, 20, 80);

    // XP bar
    const barW = 120;
    const xpRatio = Math.min(1, xp / xpToNext);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, 90, barW, 8);
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(20, 90, barW * xpRatio, 8);
    ctx.strokeStyle = '#fff4';
    ctx.strokeRect(20, 90, barW, 8);

    if (levelUpFlash > 0) {
      ctx.fillStyle = `rgba(167, 139, 250, ${Math.min(1, levelUpFlash)})`;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL UP!`, W / 2, H / 2 - 40);
    }

    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'right';
    ctx.fillText(`Time: ${(engine.time / 1000).toFixed(0)}s`, W - 20, 20);
    ctx.fillText(`Enemies: ${enemies.length}`, W - 20, 40);
  });
}
