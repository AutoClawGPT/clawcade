// Chomper — Pac-Man style maze game
// Cat collects $CLAW coins while avoiding bear ghosts

import { GameEngine } from '../engine';

export function createChomper(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;
  const CELL = 24;
  const COLS = Math.floor(W / CELL);
  const ROWS = Math.floor(H / CELL);

  // 1 = wall, 0 = path, 2 = coin, 3 = powerup
  // Tunnel rows: left/right borders open for wrap (classic Pac-Man)
  const TUNNEL_ROW = Math.floor(ROWS / 2);
  const maze: number[][] = [];

  function generateMaze() {
    maze.length = 0;
    for (let r = 0; r < ROWS; r++) {
      maze[r] = [];
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          maze[r][c] = 1;
        } else {
          maze[r][c] = 0;
        }
      }
    }

    // Open side tunnels on middle row (wrap)
    if (TUNNEL_ROW > 0 && TUNNEL_ROW < ROWS - 1) {
      maze[TUNNEL_ROW][0] = 0;
      maze[TUNNEL_ROW][COLS - 1] = 0;
      // Keep a short corridor clear
      if (COLS > 4) {
        maze[TUNNEL_ROW][1] = 0;
        maze[TUNNEL_ROW][COLS - 2] = 0;
      }
    }

    for (let r = 2; r < ROWS - 2; r += 4) {
      for (let c = 2; c < COLS - 2; c++) {
        if (c % 6 !== 0 && c < COLS - 3) maze[r][c] = 1;
      }
    }
    for (let c = 2; c < COLS - 2; c += 6) {
      for (let r = 2; r < ROWS - 2; r++) {
        if (r % 4 !== 0 && r < ROWS - 3) maze[r][c] = 1;
      }
    }

    // Don't wall over tunnel corridor
    if (TUNNEL_ROW > 0 && TUNNEL_ROW < ROWS - 1) {
      for (let c = 0; c < COLS; c++) {
        if (c === 0 || c === COLS - 1 || c === 1 || c === COLS - 2) {
          maze[TUNNEL_ROW][c] = 0;
        }
      }
    }

    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (maze[r][c] === 0) maze[r][c] = 2;
      }
    }

    const corners = [
      [2, 2], [2, COLS - 3], [ROWS - 3, 2], [ROWS - 3, COLS - 3],
    ];
    for (const [r, c] of corners) {
      if (maze[r] && maze[r][c] !== 1) maze[r][c] = 3;
    }
  }

  generateMaze();

  interface Ghost {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    scared: number;
  }

  const player = { x: 1.5 * CELL, y: 1.5 * CELL, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } };
  let ghosts: Ghost[] = [];
  let coinsCollected = 0;
  let totalCoins = 0;
  let invincible = 0;
  let lives = 3;
  let moveTimer = 0;
  let ghostEatCombo = 0;
  let ghostEatComboTimer = 0;
  let clearCeremony = 0; // ms remaining for maze-clear READY flash

  function resetPositions() {
    player.x = 1.5 * CELL;
    player.y = 1.5 * CELL;
    player.dir = { x: 0, y: 0 };
    player.nextDir = { x: 0, y: 0 };
  }

  function spawnGhosts() {
    ghosts = [];
    const colors = ['#ef4444', '#f97316', '#ec4899', '#8b5cf6'];
    const positions = [
      { x: (COLS / 2 - 2) * CELL + CELL / 2, y: (ROWS / 2 - 2) * CELL + CELL / 2 },
      { x: (COLS / 2 + 2) * CELL + CELL / 2, y: (ROWS / 2 - 2) * CELL + CELL / 2 },
      { x: (COLS / 2 - 2) * CELL + CELL / 2, y: (ROWS / 2 + 2) * CELL + CELL / 2 },
      { x: (COLS / 2 + 2) * CELL + CELL / 2, y: (ROWS / 2 + 2) * CELL + CELL / 2 },
    ];
    for (let i = 0; i < 4; i++) {
      ghosts.push({
        x: positions[i].x,
        y: positions[i].y,
        vx: (i % 2 === 0 ? 1 : -1) * 1.2,
        vy: (i < 2 ? 1 : -1) * 1.2,
        color: colors[i],
        scared: 0,
      });
    }
  }

  spawnGhosts();
  countCoins();

  function countCoins() {
    totalCoins = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 2 || maze[r][c] === 3) totalCoins++;
  }

  function cellAt(px: number, py: number): number {
    // Allow wrap on tunnel row: treat out-of-bounds x as open when on tunnel
    let c = Math.floor(px / CELL);
    const r = Math.floor(py / CELL);
    if (r === TUNNEL_ROW) {
      // wrapping handled in movement; out of bounds horizontally is open
      if (c < 0 || c >= COLS) return 0;
    }
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 1;
    return maze[r][c];
  }

  function canMove(px: number, py: number): boolean {
    const margin = CELL * 0.4;
    return (
      cellAt(px - margin, py - margin) !== 1 &&
      cellAt(px + margin, py - margin) !== 1 &&
      cellAt(px - margin, py + margin) !== 1 &&
      cellAt(px + margin, py + margin) !== 1
    );
  }

  function applyWrap(entity: { x: number; y: number }) {
    const r = Math.floor(entity.y / CELL);
    if (r === TUNNEL_ROW || Math.abs(entity.y - (TUNNEL_ROW + 0.5) * CELL) < CELL * 0.6) {
      if (entity.x < -CELL * 0.5) entity.x = (COLS - 0.5) * CELL;
      if (entity.x > (COLS + 0.5) * CELL) entity.x = 0.5 * CELL;
    }
  }

  function isNearJunction(gx: number, gy: number): boolean {
    const c = Math.floor(gx / CELL);
    const r = Math.floor(gy / CELL);
    const cx = (c + 0.5) * CELL;
    const cy = (r + 0.5) * CELL;
    return Math.abs(gx - cx) < 3 && Math.abs(gy - cy) < 3;
  }

  engine.onUpdate((dt) => {
    const inp = engine.input;
    if (engine.justPressedAny('p', 'P')) { engine.pause(); return; }
    if (engine.justPressedAny('r', 'R')) { engine.stop(); engine.start(); return; }

    // Clear ceremony freeze
    if (clearCeremony > 0) {
      clearCeremony -= dt;
      if (clearCeremony <= 0) {
        generateMaze();
        countCoins();
        spawnGhosts();
        resetPositions();
        ghostEatCombo = 0;
      }
      return;
    }

    ghostEatComboTimer = Math.max(0, ghostEatComboTimer - dt);
    if (ghostEatComboTimer <= 0) ghostEatCombo = 0;

    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) player.nextDir = { x: -1, y: 0 };
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) player.nextDir = { x: 1, y: 0 };
    if (inp.keys.has('ArrowUp') || inp.keys.has('w')) player.nextDir = { x: 0, y: -1 };
    if (inp.keys.has('ArrowDown') || inp.keys.has('s')) player.nextDir = { x: 0, y: 1 };

    moveTimer += dt;
    if (moveTimer > 50) {
      moveTimer = 0;
      const speed = 2.5;
      const nx = player.x + player.nextDir.x * speed;
      const ny = player.y + player.nextDir.y * speed;
      if (canMove(nx, ny)) {
        player.dir = { ...player.nextDir };
      }
      const mx = player.x + player.dir.x * speed;
      const my = player.y + player.dir.y * speed;
      if (canMove(mx, my)) {
        player.x = mx;
        player.y = my;
      }
      applyWrap(player);
    }

    const pc = Math.floor(player.x / CELL);
    const pr = Math.floor(player.y / CELL);
    if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) {
      if (maze[pr][pc] === 2) {
        maze[pr][pc] = 0;
        coinsCollected++;
        engine.addScore(10);
        engine.sound.play('collect');
        engine.spawnParticle(player.x, player.y, '#fbbf24', 5);
      } else if (maze[pr][pc] === 3) {
        maze[pr][pc] = 0;
        coinsCollected++;
        engine.addScore(50);
        invincible = 8000;
        engine.sound.play('powerup');
        engine.spawnParticle(player.x, player.y, '#a78bfa', 12);
        for (const g of ghosts) g.scared = 8000;
        ghostEatCombo = 0;
      }
    }

    invincible = Math.max(0, invincible - dt);

    for (const g of ghosts) {
      g.scared = Math.max(0, g.scared - dt);
      const gSpeed = g.scared > 0 ? 0.8 : 1.2;

      const gnx = g.x + g.vx * gSpeed;
      const gny = g.y + g.vy * gSpeed;

      const atJunction = isNearJunction(g.x, g.y);
      const blocked = !canMove(gnx, gny) || !canMove(gnx, g.y) || !canMove(g.x, gny);

      if (blocked || atJunction) {
        const dirs = [
          { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        ];
        const valid = dirs.filter((d) => {
          const testX = g.x + d.x * gSpeed * 3;
          const testY = g.y + d.y * gSpeed * 3;
          const reverse = d.x === -Math.sign(g.vx || 0) && d.y === -Math.sign(g.vy || 0);
          return canMove(testX, testY) && !reverse;
        });

        // Prefer chase / flee at junctions
        let pick = valid.length > 0 ? valid[Math.floor(engine.rng.next() * valid.length)] : null;
        if (valid.length > 0 && (atJunction || blocked)) {
          const dx = player.x - g.x;
          const dy = player.y - g.y;
          // Score dirs by alignment toward (or away if scared) player
          let best = valid[0];
          let bestScore = -Infinity;
          for (const d of valid) {
            let score = 0;
            if (g.scared > 0) {
              score = -(d.x * dx + d.y * dy);
            } else {
              score = d.x * dx + d.y * dy;
            }
            // Soft random so not perfectly telegraphed
            score += engine.rng.range(-CELL * 0.5, CELL * 0.5);
            if (score > bestScore) {
              bestScore = score;
              best = d;
            }
          }
          // 70% bias toward best chase pick at junctions
          if (atJunction && engine.rng.next() < 0.7) pick = best;
          else if (blocked) pick = best;
        }
        if (pick) {
          g.vx = pick.x;
          g.vy = pick.y;
        }
        if (!blocked) {
          g.x = gnx;
          g.y = gny;
        }
      } else {
        g.x = gnx;
        g.y = gny;
      }
      applyWrap(g);

      const dx = g.x - player.x;
      const dy = g.y - player.y;
      if (dx * dx + dy * dy < (CELL * 0.8) * (CELL * 0.8)) {
        if (invincible > 0 || g.scared > 0) {
          ghostEatCombo++;
          ghostEatComboTimer = 3000;
          const pts = 200 * ghostEatCombo;
          engine.addScore(pts);
          engine.sound.play('explosion');
          engine.spawnParticle(g.x, g.y, g.color, 15);
          engine.shake(3 + ghostEatCombo, 100);
          engine.hitStop(50 + ghostEatCombo * 15);
          engine.addTrauma(0.2);
          engine.logMove('eat_ghost', g.x, g.y);
          g.x = (COLS / 2) * CELL;
          g.y = (ROWS / 2) * CELL;
          g.scared = 0;
        } else {
          lives--;
          engine.sound.play('die');
          engine.spawnParticle(player.x, player.y, '#ef4444', 10);
          engine.shake(6, 180);
          engine.hitStop(80);
          if (lives <= 0) {
            engine.gameOver();
            return;
          }
          resetPositions();
        }
      }
    }

    let remaining = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 2 || maze[r][c] === 3) remaining++;
    if (remaining === 0 && clearCeremony <= 0) {
      engine.addScore(500);
      engine.sound.play('powerup');
      engine.sound.play('combo');
      engine.addTrauma(0.35);
      engine.hitStop(80);
      clearCeremony = 900; // READY flash then next board
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        if (maze[r][c] === 1) {
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#4338ca';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
        } else if (maze[r][c] === 2) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (maze[r][c] === 3) {
          ctx.fillStyle = '#a78bfa';
          ctx.beginPath();
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;
          ctx.moveTo(cx, cy - 6);
          ctx.lineTo(cx + 6, cy);
          ctx.lineTo(cx, cy + 6);
          ctx.lineTo(cx - 6, cy);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Tunnel markers
    ctx.fillStyle = '#312e81';
    ctx.fillRect(0, TUNNEL_ROW * CELL + 4, 4, CELL - 8);
    ctx.fillRect(W - 4, TUNNEL_ROW * CELL + 4, 4, CELL - 8);

    for (const g of ghosts) {
      ctx.save();
      ctx.fillStyle = g.scared > 0 ? '#3b82f6' : g.color;
      ctx.beginPath();
      ctx.arc(g.x, g.y - 4, CELL * 0.4, Math.PI, 0);
      ctx.lineTo(g.x + CELL * 0.4, g.y + CELL * 0.35);
      for (let i = 3; i >= -3; i--) {
        const wx = g.x + (i / 3) * CELL * 0.4;
        const wy = g.y + CELL * 0.35 + (i % 2 === 0 ? 4 : -2);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(g.x - 4, g.y - 6, 3, 0, Math.PI * 2);
      ctx.arc(g.x + 4, g.y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.scared > 0 ? '#ef4444' : '#000';
      ctx.beginPath();
      ctx.arc(g.x - 4, g.y - 6, 1.5, 0, Math.PI * 2);
      ctx.arc(g.x + 4, g.y - 6, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.save();
    if (invincible > 0) ctx.globalAlpha = 0.6 + Math.sin(engine.time * 0.01) * 0.4;

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(player.x, player.y, CELL * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(player.x - 6, player.y - 10);
    ctx.lineTo(player.x - 10, player.y - 18);
    ctx.lineTo(player.x - 1, player.y - 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(player.x + 6, player.y - 10);
    ctx.lineTo(player.x + 10, player.y - 18);
    ctx.lineTo(player.x + 1, player.y - 12);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x - 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    const mouthAngle = Math.abs(Math.sin(engine.time * 0.008)) * 0.5;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x, player.y + 4, 4, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(player.x, player.y + 4);
    ctx.fill();

    ctx.restore();

    // Clear ceremony overlay
    if (clearCeremony > 0) {
      ctx.fillStyle = `rgba(0,0,0,${0.45})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOARD CLEAR!', W / 2, H / 2 - 20);
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('READY', W / 2, H / 2 + 20);
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.fillText('+500', W / 2, H / 2 + 48);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$CLAW: ${coinsCollected}`, 20, 20);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`Lives: ${'❤'.repeat(lives)}`, 20, 40);
    if (invincible > 0) {
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(`DIAMOND HANDS! ${(invincible / 1000).toFixed(1)}s`, W / 2 - 80, 20);
    }
    if (ghostEatCombo > 1) {
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${ghostEatCombo}x GHOST COMBO!`, W / 2, 50);
    }
  });
}
