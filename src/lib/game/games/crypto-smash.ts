// Crypto Smash — Fighter game
// Cat with claws punches rug-pull scammers

import { GameEngine } from '../engine';

interface Entity {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  color: string;
  type: string;
  attackCd: number;
  flash: number;
}

export function createCryptoSmash(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;

  const player: Entity = {
    x: W / 2, y: H - 100, w: 40, h: 50,
    vx: 0, vy: 0, hp: 100, maxHp: 100,
    color: '#f59e0b', type: 'player', attackCd: 0, flash: 0,
  };
  let facing: 1 | -1 = 1;
  let slashTimer = 0; // facing melee VFX
  let playerIFrames = 0;

  const enemies: Entity[] = [];
  const projectiles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  let combo = 0;
  let comboTimer = 0;
  let waveNum = 0;
  let spawnTimer = 0;
  let difficulty = 1;
  const speed = 4;
  const gravity = 0.5;

  function spawnEnemy() {
    const types = ['rugpull', 'scam', 'honeypot', 'dumpster'];
    const type = types[engine.rng.intRange(0, types.length - 1)];
    const side = engine.rng.next() > 0.5;
    const colors: Record<string, string> = {
      rugpull: '#ef4444',
      scam: '#dc2626',
      honeypot: '#b91c1c',
      dumpster: '#991b1b',
    };
    const sizes: Record<string, { w: number; h: number }> = {
      rugpull: { w: 35, h: 40 },
      scam: { w: 30, h: 35 },
      honeypot: { w: 45, h: 50 },
      dumpster: { w: 50, h: 55 },
    };
    const hpMap: Record<string, number> = {
      rugpull: 20, scam: 15, honeypot: 40, dumpster: 60,
    };
    const s = sizes[type];
    enemies.push({
      x: side ? -50 : W + 50,
      y: H - 100 - engine.rng.range(0, 50),
      w: s.w, h: s.h,
      vx: side ? engine.rng.range(0.5, 1.5) * difficulty : -engine.rng.range(0.5, 1.5) * difficulty,
      vy: 0,
      hp: hpMap[type] * difficulty,
      maxHp: hpMap[type] * difficulty,
      color: colors[type],
      type,
      attackCd: 0,
      flash: 0,
    });
  }

  function onPlayerLandedHit(e: Entity, dmg: number) {
    e.hp -= dmg;
    e.flash = 0.15;
    // Knockback away from player
    const dir = e.x >= player.x ? 1 : -1;
    e.vx += dir * 2.5;
    e.x += dir * 8;
    engine.sound.play('hit');
    engine.spawnParticle(e.x, e.y, '#fbbf24', 8);
    engine.hitStop(40);
    engine.addTrauma(0.15);
    engine.logMove('attack_hit', e.x, e.y);
  }

  engine.onUpdate((dt) => {
    const sDt = dt / 1000;
    const inp = engine.input;

    if (engine.justPressedAny('p', 'P')) { engine.pause(); return; }
    if (engine.justPressedAny('r', 'R')) { engine.stop(); engine.start(); return; }

    slashTimer = Math.max(0, slashTimer - dt);
    playerIFrames = Math.max(0, playerIFrames - dt);

    // Player movement
    player.vx = 0;
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) player.vx = -speed;
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) player.vx = speed;
    if (player.vx < 0) facing = -1;
    if (player.vx > 0) facing = 1;
    player.x += player.vx;
    player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

    // Jump — edge-triggered (no bunny-hop hold)
    const grounded = player.y >= H - 100;
    if (engine.justPressedAny('ArrowUp', 'w') && grounded) {
      player.vy = -10;
      engine.logMove('jump', player.x);
    }
    player.vy += gravity;
    player.y += player.vy;
    if (player.y > H - 100) { player.y = H - 100; player.vy = 0; }

    // Melee — edge-triggered
    player.attackCd -= dt;
    if (player.attackCd <= 0 && engine.justPressedAny('z', 'j', ' ')) {
      player.attackCd = 200;
      slashTimer = 140;
      engine.sound.play('hit');
      engine.logMove('attack', player.x, player.y);
      // Facing-based melee arc
      const range = 70;
      const attackRect = {
        x: facing > 0 ? player.x : player.x - range,
        y: player.y - player.h / 2,
        w: range,
        h: player.h,
      };
      for (const e of enemies) {
        const eRect = { x: e.x - e.w / 2, y: e.y - e.h / 2, w: e.w, h: e.h };
        if (GameEngine.rectRect(attackRect, eRect)) {
          const dmg = 12 + combo * 2;
          onPlayerLandedHit(e, dmg);
        }
      }
    }

    // Projectile — edge-triggered
    if (player.attackCd <= 0 && engine.justPressedAny('x', 'k', 'Enter')) {
      player.attackCd = 300;
      let aimDir: 1 | -1 = facing;
      let nearest: Entity | null = null;
      let nearD = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearD) { nearD = d; nearest = e; }
      }
      if (nearest) aimDir = nearest.x >= player.x ? 1 : -1;
      projectiles.push({
        x: player.x + aimDir * 30,
        y: player.y - 10,
        vx: aimDir * 8,
        vy: 0,
        life: 1,
      });
      engine.sound.play('shoot');
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.life -= sDt * 2;
      if (p.life <= 0 || p.x < 0 || p.x > W) { projectiles.splice(i, 1); continue; }
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        if (dx * dx + dy * dy < 30 * 30) {
          onPlayerLandedHit(e, 15);
          projectiles.splice(i, 1);
          break;
        }
      }
    }

    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;

    spawnTimer -= dt;
    difficulty = 1 + waveNum * 0.15;
    if (spawnTimer <= 0) {
      spawnTimer = Math.max(500, 2000 - waveNum * 100);
      const count = 1 + Math.floor(waveNum / 3);
      for (let i = 0; i < count; i++) spawnEnemy();
      waveNum++;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx;
      e.flash = Math.max(0, e.flash - sDt);

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50 && playerIFrames <= 0) {
        e.attackCd -= dt;
        if (e.attackCd <= 0) {
          e.attackCd = 800;
          player.hp -= 8;
          player.flash = 0.2;
          playerIFrames = 600;
          engine.sound.play('hit');
          engine.spawnParticle(player.x, player.y, '#fbbf24', 4);
          engine.shake(4, 120);
          engine.hitStop(50);
        }
      } else if (dist > 0) {
        e.vx = (dx / dist) * 0.8 * difficulty;
      }

      if (e.hp <= 0) {
        combo++;
        comboTimer = 2000;
        engine.addScore(10 * combo);
        engine.sound.play('explosion');
        engine.spawnParticle(e.x, e.y, e.color, 15);
        engine.shake(3 + Math.min(combo, 5), 120);
        if (combo === 3 || combo === 5 || combo === 10) engine.sound.play('combo');
        enemies.splice(i, 1);
        continue;
      }

      if (e.x < -100 || e.x > W + 100) enemies.splice(i, 1);
    }

    if (player.hp <= 0) {
      engine.gameOver();
    }

    player.flash = Math.max(0, player.flash - sDt);
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.fillStyle = '#1e1e3f';
    ctx.fillRect(0, H - 80, W, 80);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();

    const px = player.x;
    const py = player.y;
    ctx.save();
    if (player.flash > 0 || (playerIFrames > 0 && Math.floor(playerIFrames / 60) % 2 === 0)) {
      ctx.globalAlpha = 0.5 + Math.sin(engine.time * 0.02) * 0.5;
    }

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(px, py - 15, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py - 40, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(px - 10, py - 52);
    ctx.lineTo(px - 16, py - 65);
    ctx.lineTo(px - 2, py - 55);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 10, py - 52);
    ctx.lineTo(px + 16, py - 65);
    ctx.lineTo(px + 2, py - 55);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 5, py - 42, 4, 0, Math.PI * 2);
    ctx.arc(px + 5, py - 42, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - 5 + facing * 1, py - 42, 2, 0, Math.PI * 2);
    ctx.arc(px + 5 + facing * 1, py - 42, 2, 0, Math.PI * 2);
    ctx.fill();

    // Claws — facing side only (resting), plus slash VFX
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    const side = facing;
    ctx.beginPath();
    ctx.moveTo(px + side * 20, py - 20); ctx.lineTo(px + side * 35, py - 25);
    ctx.moveTo(px + side * 20, py - 15); ctx.lineTo(px + side * 35, py - 15);
    ctx.moveTo(px + side * 20, py - 10); ctx.lineTo(px + side * 35, py - 5);
    ctx.stroke();

    if (slashTimer > 0) {
      const t = slashTimer / 140;
      ctx.strokeStyle = `rgba(251, 191, 36, ${t})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      const arcR = 40 + (1 - t) * 20;
      const start = facing > 0 ? -0.8 : Math.PI - 0.8;
      const end = facing > 0 ? 0.8 : Math.PI + 0.8;
      ctx.arc(px, py - 15, arcR, start, end);
      ctx.stroke();
      // Extra claw streaks
      ctx.strokeStyle = `rgba(255,255,255,${t * 0.8})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const oy = -22 + i * 10;
        ctx.beginPath();
        ctx.moveTo(px + facing * 18, py + oy);
        ctx.lineTo(px + facing * (45 + (1 - t) * 15), py + oy - 4 + i * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    for (const e of enemies) {
      ctx.save();
      if (e.flash > 0) ctx.globalAlpha = 0.5 + Math.sin(engine.time * 0.03) * 0.5;

      ctx.fillStyle = e.color;
      if (e.type === 'rugpull') {
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RUG', e.x, e.y);
      } else if (e.type === 'scam') {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - e.h / 2);
        ctx.lineTo(e.x - e.w / 2, e.y + e.h / 2);
        ctx.lineTo(e.x + e.w / 2, e.y + e.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', e.x, e.y + 5);
      } else if (e.type === 'honeypot') {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🍯', e.x, e.y + 4);
      } else {
        ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        ctx.fillStyle = '#000';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DUMP', e.x, e.y + 3);
      }

      if (e.hp < e.maxHp) {
        const barW = e.w + 10;
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - barW / 2, e.y - e.h / 2 - 10, barW, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - barW / 2, e.y - e.h / 2 - 10, barW * (e.hp / e.maxHp), 4);
      }

      ctx.restore();
    }

    ctx.fillStyle = '#fbbf24';
    for (const p of projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const barW = 200;
    const barX = 20;
    const barY = 20;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 16);
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX, barY, barW * hpRatio, 16);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 16);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${Math.ceil(player.hp)}`, barX + barW / 2, barY + 12);

    if (combo > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${combo}x COMBO!`, W / 2, 60);
    }

    ctx.fillStyle = '#a78bfa';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Wave ${waveNum}`, W - 20, 35);
  });
}
