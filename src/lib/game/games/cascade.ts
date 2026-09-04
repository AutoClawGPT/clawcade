// Cascade — Match-3 puzzle game with crypto symbols

import { GameEngine } from '../engine';

export function createCascade(engine: GameEngine) {
  const W = engine.width;
  const H = engine.height;
  const COLS = 8;
  const ROWS = 10;
  const CELL = Math.min(Math.floor((H - 100) / ROWS), Math.floor((W - 40) / COLS));
  const OFFSET_X = (W - COLS * CELL) / 2;
  const OFFSET_Y = 80;

  type Symbol = 'BTC' | 'ETH' | 'SOL' | 'DOGE' | 'CLAW' | 'MOON';
  const SYMBOLS: Symbol[] = ['BTC', 'ETH', 'SOL', 'DOGE', 'CLAW', 'MOON'];
  const COLORS: Record<Symbol, string> = {
    BTC: '#f59e0b', ETH: '#8b5cf6', SOL: '#14b8a6',
    DOGE: '#eab308', CLAW: '#f97316', MOON: '#ec4899',
  };
  const ICONS: Record<Symbol, string> = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', DOGE: 'Ð', CLAW: '🐾', MOON: '🌙',
  };

  interface Cell {
    symbol: Symbol;
    row: number;
    col: number;
    offsetY: number; // animation offset
    removing: boolean;
    removeTimer: number;
  }

  let grid: (Cell | null)[][] = [];
  let selected: { r: number; c: number } | null = null;
  let cursor: { r: number; c: number } = { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) };
  let combo = 0;
  let fallSpeed = 3;
  let processing = false;
  const MAX_TIME = 180 * 1000; // 3-minute game
  let gameEnded = false;

  // dt-based cascade phases (no setTimeout)
  type Phase = 'idle' | 'removing' | 'dropping' | 'checking';
  let phase: Phase = 'idle';
  let phaseTimer = 0;
  let pendingMatches: Set<string> = new Set();

  function randomSymbol(): Symbol {
    return SYMBOLS[engine.rng.intRange(0, SYMBOLS.length - 1)];
  }

  function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let sym = randomSymbol();
        let attempts = 0;
        while (attempts < 20) {
          const leftMatch = c >= 2 && grid[r][c - 1]?.symbol === sym && grid[r][c - 2]?.symbol === sym;
          const upMatch = r >= 2 && grid[r - 1]?.[c]?.symbol === sym && grid[r - 2]?.[c]?.symbol === sym;
          if (!leftMatch && !upMatch) break;
          sym = randomSymbol();
          attempts++;
        }
        grid[r][c] = { symbol: sym, row: r, col: c, offsetY: 0, removing: false, removeTimer: 0 };
      }
    }
  }

  initGrid();

  function findMatches(): Set<string> {
    const matched = new Set<string>();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const s = grid[r][c]?.symbol;
        if (s && grid[r][c + 1]?.symbol === s && grid[r][c + 2]?.symbol === s) {
          let end = c + 2;
          while (end + 1 < COLS && grid[r][end + 1]?.symbol === s) end++;
          for (let i = c; i <= end; i++) matched.add(`${r},${i}`);
        }
      }
    }

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const s = grid[r][c]?.symbol;
        if (s && grid[r + 1]?.[c]?.symbol === s && grid[r + 2]?.[c]?.symbol === s) {
          let end = r + 2;
          while (end + 1 < ROWS && grid[end + 1]?.[c]?.symbol === s) end++;
          for (let i = r; i <= end; i++) matched.add(`${i},${c}`);
        }
      }
    }

    return matched;
  }

  function hasValidMove(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = grid[r]?.[c];
        if (!a) continue;
        const neighbors = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dr, dc] of neighbors) {
          const nr = r + dr, nc = c + dc;
          const b = grid[nr]?.[nc];
          if (!b) continue;
          grid[r][c] = b; grid[nr][nc] = a;
          const m = findMatches();
          grid[r][c] = a; grid[nr][nc] = b;
          if (m.size > 0) return true;
        }
      }
    }
    return false;
  }

  function beginRemove(matches: Set<string>) {
    combo++;
    const pts = matches.size * 10 * combo;
    engine.addScore(pts);
    engine.sound.play(combo > 1 ? 'combo' : 'collect');
    engine.shake(Math.min(4 + combo, 10), Math.min(80 + combo * 20, 220));
    if (combo >= 3) engine.hitStop(40);

    for (const key of Array.from(matches)) {
      const [r, c] = key.split(',').map(Number);
      const cell = grid[r]?.[c];
      if (cell) {
        cell.removing = true;
        cell.removeTimer = 250;
        engine.spawnParticle(
          OFFSET_X + c * CELL + CELL / 2,
          OFFSET_Y + r * CELL + CELL / 2,
          COLORS[cell.symbol],
          5,
        );
      }
    }
    pendingMatches = matches;
    phase = 'removing';
    phaseTimer = 250;
    processing = true;
  }

  function applyDrop() {
    for (const key of Array.from(pendingMatches)) {
      const [r, c] = key.split(',').map(Number);
      grid[r][c] = null;
    }
    pendingMatches = new Set();

    for (let c = 0; c < COLS; c++) {
      let empty = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!grid[r][c]) {
          empty++;
        } else if (empty > 0) {
          grid[r + empty][c] = grid[r][c];
          grid[r + empty][c]!.row = r + empty;
          grid[r + empty][c]!.offsetY = -empty * CELL;
          grid[r][c] = null;
        }
      }
      for (let r = 0; r < empty; r++) {
        grid[r][c] = {
          symbol: randomSymbol(),
          row: r,
          col: c,
          offsetY: -empty * CELL,
          removing: false,
          removeTimer: 0,
        };
      }
    }
    phase = 'dropping';
    phaseTimer = 180;
  }

  function checkCascade() {
    const matches = findMatches();
    if (matches.size === 0) {
      combo = 0;
      processing = false;
      phase = 'idle';
      phaseTimer = 0;
      return;
    }
    beginRemove(matches);
  }

  function swap(r1: number, c1: number, r2: number, c2: number) {
    if (processing || phase !== 'idle') return;
    const a = grid[r1]?.[c1];
    const b = grid[r2]?.[c2];
    if (!a || !b) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    // Swap
    grid[r1][c1] = b;
    grid[r2][c2] = a;
    a.row = r2; a.col = c2;
    b.row = r1; b.col = c1;

    const matches = findMatches();
    if (matches.size === 0) {
      // Swap back
      grid[r1][c1] = a;
      grid[r2][c2] = b;
      a.row = r1; a.col = c1;
      b.row = r2; b.col = c2;
      return;
    }

    engine.logMove('swap', c1, r1);
    combo = 0;
    beginRemove(matches);
  }

  function cellFromPointer(mx: number, my: number): { r: number; c: number } | null {
    const c = Math.floor((mx - OFFSET_X) / CELL);
    const r = Math.floor((my - OFFSET_Y) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  function handleSelectOrSwap(r: number, c: number) {
    if (processing || phase !== 'idle') return;
    if (!selected) {
      selected = { r, c };
      cursor = { r, c };
      return;
    }
    if (selected.r === r && selected.c === c) {
      selected = null;
      return;
    }
    if (Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1) {
      const sr = selected.r, sc = selected.c;
      selected = null;
      swap(sr, sc, r, c);
    } else {
      selected = { r, c };
      cursor = { r, c };
    }
  }

  engine.onUpdate((dt) => {
    const inp = engine.input;
    if (engine.justPressedAny('p', 'P')) { engine.pause(); return; }
    if (engine.justPressedAny('r', 'R')) { engine.stop(); engine.start(); return; }

    // Animate offsets + remove timers
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r]?.[c];
        if (!cell) continue;
        if (cell.offsetY < 0) {
          cell.offsetY = Math.min(0, cell.offsetY + fallSpeed * dt * 0.1);
        }
        if (cell.removing) {
          cell.removeTimer -= dt;
        }
      }
    }

    fallSpeed = 3 + engine.time / 30000;

    // dt-based cascade state machine
    if (phase !== 'idle') {
      phaseTimer -= dt;
      if (phase === 'removing' && phaseTimer <= 0) {
        applyDrop();
      } else if (phase === 'dropping' && phaseTimer <= 0) {
        // Wait until pieces mostly settled
        let settling = false;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r]?.[c] && grid[r][c]!.offsetY < -2) settling = true;
          }
        }
        if (!settling) {
          phase = 'checking';
          phaseTimer = 50;
        } else {
          phaseTimer = 40;
        }
      } else if (phase === 'checking' && phaseTimer <= 0) {
        checkCascade();
      }
    }

    if (!gameEnded && engine.time >= MAX_TIME) {
      gameEnded = true;
      engine.gameOver();
      return;
    }

    if (!gameEnded && phase === 'idle' && !processing && !selected && !hasValidMove()) {
      gameEnded = true;
      engine.gameOver();
      return;
    }

    if (phase !== 'idle' || processing) return;

    // Pointer / tap: select cell, tap adjacent to swap
    if (inp.mouseJustPressed || inp.touchJustPressed) {
      const cell = cellFromPointer(inp.mouseX, inp.mouseY);
      if (cell) handleSelectOrSwap(cell.r, cell.c);
    }

    // Keyboard: arrows move cursor; Z selects / swaps with neighbor; Enter/Space swaps first valid
    if (engine.justPressed('ArrowLeft') || engine.justPressed('a')) {
      cursor.c = Math.max(0, cursor.c - 1);
    }
    if (engine.justPressed('ArrowRight') || engine.justPressed('d')) {
      cursor.c = Math.min(COLS - 1, cursor.c + 1);
    }
    if (engine.justPressed('ArrowUp') || engine.justPressed('w')) {
      cursor.r = Math.max(0, cursor.r - 1);
    }
    if (engine.justPressed('ArrowDown') || engine.justPressed('s')) {
      cursor.r = Math.min(ROWS - 1, cursor.r + 1);
    }

    if (engine.justPressedAny('z', 'j')) {
      handleSelectOrSwap(cursor.r, cursor.c);
    }

    if (engine.justPressedAny(' ', 'Enter', 'x')) {
      const { r, c } = selected ?? cursor;
      if (!selected) {
        selected = { r, c };
      } else {
        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let swapped = false;
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            const a = grid[r][c];
            const b = grid[nr][nc];
            if (a && b) {
              grid[r][c] = b;
              grid[nr][nc] = a;
              a.row = nr; a.col = nc;
              b.row = r; b.col = c;
              const m = findMatches();
              grid[r][c] = a;
              grid[nr][nc] = b;
              a.row = r; a.col = c;
              b.row = nr; b.col = nc;
              if (m.size > 0) {
                selected = null;
                swap(r, c, nr, nc);
                swapped = true;
                break;
              }
            }
          }
        }
        if (!swapped && c + 1 < COLS) {
          selected = null;
          swap(r, c, r, c + 1);
        } else if (!swapped) {
          selected = null;
        }
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(OFFSET_X - 4, OFFSET_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = OFFSET_X + c * CELL;
        const y = OFFSET_Y + r * CELL;

        ctx.fillStyle = (r + c) % 2 === 0 ? '#16162a' : '#1a1a30';
        ctx.fillRect(x, y, CELL, CELL);

        const cell = grid[r]?.[c];
        if (!cell) continue;
        if (cell.removing && cell.removeTimer <= 0) continue;

        const cx = x + CELL / 2;
        const cy = y + CELL / 2 + cell.offsetY;
        const color = COLORS[cell.symbol];

        ctx.save();
        const scale = cell.removing ? Math.max(0.15, cell.removeTimer / 250) : 1;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 6);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(CELL * 0.35)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ICONS[cell.symbol], 0, 0);

        ctx.restore();
      }
    }

    // Cursor (always shown)
    {
      const sx = OFFSET_X + cursor.c * CELL;
      const sy = OFFSET_Y + cursor.r * CELL;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 3, sy + 3, CELL - 6, CELL - 6);
    }

    // Selection highlight
    if (selected) {
      const sx = OFFSET_X + selected.c * CELL;
      const sy = OFFSET_Y + selected.r * CELL;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 2, sy + 2, CELL - 4, CELL - 4);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${engine.score}`, 20, 30);

    if (combo > 1) {
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${combo}x CASCADE!`, W / 2, 60);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Tap/click select→swap • Arrows move • Z select • Enter swap', W / 2, H - 10);

    const timeLeft = Math.max(0, Math.ceil((MAX_TIME - engine.time) / 1000));
    ctx.fillStyle = timeLeft <= 30 ? '#ef4444' : '#64748b';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`, W - 20, 30);
  });
}
