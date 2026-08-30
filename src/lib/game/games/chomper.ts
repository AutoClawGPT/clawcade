// Chomber — Pac-Man style maze game
// Cat collects $CLAW coins while avoiding bear ghosts

import { GameEngine } from '../engine';

export function createChomper(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;
  const CELL = 24;
  const COLS = Math.floor(W / CELL);
  const ROWS = Math.floor(H / CELL);

  // 1 = wall, 0 = path, 2 = coin, 3 = powerup
  const maze: number[][] = [];

  function generateMaze() {
    maze.length = 0;
    for (let r = 0; r < ROWS; r++) {
      maze[r] = [];
      for (let c = 0; c < COLS; c++) {
        // Borders
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          maze[r][c] = 1;
        } else {
          maze[r][c] = 0;
        }
      }
    }

    // Inner walls (pattern)
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

    // Place coins on all non-wall cells
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (maze[r][c] === 0) maze[r][c] = 2;
      }
    }

    // Place powerups (4 corners area)
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
    scared: number; // timer for scared state
  }

  const player = { x: 1.5 * CELL, y: 1.5 * CELL, dir: { x: 0, y: 0 }, nextDir: { x: 0, y: 0 } };
  let ghosts: Ghost[] = [];
  let coinsCollected = 0;
  let totalCoins = 0;
  let invincible = 0; // ms remaining
  let lives = 3;
  let moveTimer = 0;

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
    const c = Math.floor(px / CELL);
    const r = Math.floor(py / CELL);
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

  engine.onUpdate((dt) => {
    const inp = engine.input;
    if (inp.keys.has('p') || inp.keys.has('P')) { engine.pause(); return; }
    if (inp.keys.has('r') || inp.keys.has('R')) { engine.stop(); engine.start(); return; }

    // Direction from input
    if (inp.keys.has('ArrowLeft') || inp.keys.has('a')) player.nextDir = { x: -1, y: 0 };
    if (inp.keys.has('ArrowRight') || inp.keys.has('d')) player.nextDir = { x: 1, y: 0 };
    if (inp.keys.has('ArrowUp') || inp.keys.has('w')) player.nextDir = { x: 0, y: -1 };
    if (inp.keys.has('ArrowDown') || inp.keys.has('s')) player.nextDir = { x: 0, y: 1 };

    // Try next direction
    moveTimer += dt;
    if (moveTimer > 50) {
      moveTimer = 0;
      const speed = 2.5;
      const nx = player.x + player.nextDir.x * speed;
      const ny = player.y + player.nextDir.y * speed;
      if (canMove(nx, ny)) {
        player.dir = { ...player.nextDir };
      }
      // Move in current direction
      const mx = player.x + player.dir.x * speed;
      const my = player.y + player.dir.y * speed;
      if (canMove(mx, my)) {
        player.x = mx;
        player.y = my;
      }
    }

    // Collect coins
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
      }
    }

    // Invincibility timer
    invincible = Math.max(0, invincible - dt);

    // Update ghosts
    for (const g of ghosts) {
      g.scared = Math.max(0, g.scared - dt);
      const gSpeed = g.scared > 0 ? 0.8 : 1.2;

      // Move ghost
      const gnx = g.x + g.vx * gSpeed;
      const gny = g.y + g.vy * gSpeed;

      if (!canMove(gnx, gny) || !canMove(gnx, g.y) || !canMove(g.x, gny)) {
        // Change direction
        const dirs = [
          { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        ];
        const valid = dirs.filter((d) => {
          const testX = g.x + d.x * gSpeed * 3;
          const testY = g.y + d.y * gSpeed * 3;
          return canMove(testX, testY) && !(d.x === -g.vx && d.y === -g.vy);
        });
        if (valid.length > 0) {
          const pick = valid[Math.floor(engine.rng.next() * valid.length)];
          g.vx = pick.x;
          g.vy = pick.y;
        }
      } else {
        g.x = gnx;
        g.y = gny;

        // Occasionally chase player
        if (engine.rng.next() < 0.005) {
          const dx = player.x - g.x;
          const dy = player.y - g.y;
          if (g.scared > 0) {
            // Run away
            g.vx = dx > 0 ? -1 : 1;
            g.vy = dy > 0 ? -1 : 1;
          } else {
            if (Math.abs(dx) > Math.abs(dy)) {
              g.vx = dx > 0 ? 1 : -1;
              g.vy = 0;
            } else {
              g.vx = 0;
              g.vy = dy > 0 ? 1 : -1;
            }
          }
        }
      }

      // Collision with player
      const dx = g.x - player.x;
      const dy = g.y - player.y;
      if (dx * dx + dy * dy < (CELL * 0.8) * (CELL * 0.8)) {
        if (invincible > 0 || g.scared > 0) {
          // Eat ghost
          engine.addScore(200);
          engine.sound.play('explosion');
          engine.spawnParticle(g.x, g.y, g.color, 15);
          engine.shake(3, 100);
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

    // Win condition: all coins collected
    let remaining = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 2 || maze[r][c] === 3) remaining++;
    if (remaining === 0) {
      engine.addScore(500);
      generateMaze();
      countCoins();
      spawnGhosts();
      resetPositions();
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    // Background
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    // Maze
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
          // Coin
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (maze[r][c] === 3) {
          // Power-up (diamond hands)
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

    // Ghosts
    for (const g of ghosts) {
      ctx.save();
      ctx.fillStyle = g.scared > 0 ? '#3b82f6' : g.color;
      // Ghost body
      ctx.beginPath();
      ctx.arc(g.x, g.y - 4, CELL * 0.4, Math.PI, 0);
      ctx.lineTo(g.x + CELL * 0.4, g.y + CELL * 0.35);
      // Wavy bottom
      for (let i = 3; i >= -3; i--) {
        const wx = g.x + (i / 3) * CELL * 0.4;
        const wy = g.y + CELL * 0.35 + (i % 2 === 0 ? 4 : -2);
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();

      // Eyes
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

    // Player (cat)
    ctx.save();
    if (invincible > 0) ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.4;

    // Body
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(player.x, player.y, CELL * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Ears
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

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x - 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(player.x + 3, player.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (chomping)
    const mouthAngle = Math.abs(Math.sin(Date.now() * 0.008)) * 0.5;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x, player.y + 4, 4, mouthAngle, Math.PI * 2 - mouthAngle);
    ctx.lineTo(player.x, player.y + 4);
    ctx.fill();

    ctx.restore();

    // HUD
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
  });
}
