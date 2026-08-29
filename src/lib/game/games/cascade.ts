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
  let combo = 0;
  let score = 0;
  let fallSpeed = 3;
  let swapAnim: { from: { r: number; c: number }; to: { r: number; c: number }; t: number } | null = null;
  let processing = false;

  function randomSymbol(): Symbol {
    return SYMBOLS[engine.rng.intRange(0, SYMBOLS.length - 1)];
  }

  function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        let sym = randomSymbol();
        // Avoid initial matches
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

    // Horizontal
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

    // Vertical
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

  function removeAndDrop() {
    const matches = findMatches();
    if (matches.size === 0) {
      combo = 0;
      processing = false;
      return;
    }

    combo++;
    const pts = matches.size * 10 * combo;
    engine.addScore(pts);
    engine.sound.play(combo > 1 ? 'combo' : 'collect');

    // Mark for removal
    for (const key of Array.from(matches)) {
      const [r, c] = key.split(',').map(Number);
      const cell = grid[r]?.[c];
      if (cell) {
        cell.removing = true;
        cell.removeTimer = 300;
        engine.spawnParticle(
          OFFSET_X + c * CELL + CELL / 2,
          OFFSET_Y + r * CELL + CELL / 2,
          COLORS[cell.symbol],
          5,
        );
      }
    }

    // Remove after short delay
    setTimeout(() => {
      for (const key of Array.from(matches)) {
        const [r, c] = key.split(',').map(Number);
        grid[r][c] = null;
      }

      // Drop down
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
        // Fill top
        for (let r = 0; r < empty; r++) {
          grid[r][c] = { symbol: randomSymbol(), row: r, col: c, offsetY: -empty * CELL, removing: false, removeTimer: 0 };
        }
      }

      // Check for cascading matches
      setTimeout(() => removeAndDrop(), 200);
    }, 250);
  }

  function swap(r1: number, c1: number, r2: number, c2: number) {
    if (processing) return;
    const a = grid[r1]?.[c1];
    const b = grid[r2]?.[c2];
    if (!a || !b) return;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;

    processing = true;
    // Swap
    grid[r1][c1] = b;
    grid[r2][c2] = a;
    a.row = r2; a.col = c2;
    b.row = r1; b.col = c1;

    // Check if valid move
    const matches = findMatches();
    if (matches.size === 0) {
      // Swap back
      grid[r1][c1] = a;
      grid[r2][c2] = b;
      a.row = r1; a.col = c1;
      b.row = r2; b.col = c2;
      processing = false;
      return;
    }

    engine.logMove('swap', c1, r1);
    combo = 0;
    removeAndDrop();
  }

  engine.onUpdate((dt) => {
    const inp = engine.input;
    if (inp.keys.has('p') || inp.keys.has('P')) { engine.pause(); return; }
    if (inp.keys.has('r') || inp.keys.has('R')) { engine.stop(); engine.start(); return; }

    // Animate offsets
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

    // Speed up over time
    fallSpeed = 3 + engine.time / 30000;

    // Input: arrow keys to move selection, space to select/swap
    if (!processing) {
      if (inp.keys.has('z') || inp.keys.has('j')) {
        // Select
        if (!selected) {
          // Find center cell or last input position
          selected = { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) };
        }
      }
      if (selected) {
        if (inp.keys.has('ArrowLeft')) { selected.c = Math.max(0, selected.c - 1); inp.keys.delete('ArrowLeft'); }
        if (inp.keys.has('ArrowRight')) { selected.c = Math.min(COLS - 1, selected.c + 1); inp.keys.delete('ArrowRight'); }
        if (inp.keys.has('ArrowUp')) { selected.r = Math.max(0, selected.r - 1); inp.keys.delete('ArrowUp'); }
        if (inp.keys.has('ArrowDown')) { selected.r = Math.min(ROWS - 1, selected.r + 1); inp.keys.delete('ArrowDown'); }

        // Swap with adjacent using directional key + space
        if (inp.keys.has(' ') || inp.keys.has('Enter')) {
          inp.keys.delete(' ');
          inp.keys.delete('Enter');
          if (!selected) {
            selected = { r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) };
          } else {
            // Auto-swap with right neighbor (or confirm selection)
            const { r, c } = selected;
            // Try to find a valid swap
            const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            let swapped = false;
            for (const [dr, dc] of dirs) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                // Temporarily swap and check
                const a = grid[r][c];
                const b = grid[nr][nc];
                if (a && b) {
                  grid[r][c] = b;
                  grid[nr][nc] = a;
                  a.row = nr; a.col = nc;
                  b.row = r; b.col = c;
                  const m = findMatches();
                  // Swap back
                  grid[r][c] = a;
                  grid[nr][nc] = b;
                  a.row = r; a.col = c;
                  b.row = nr; b.col = nc;
                  if (m.size > 0) {
                    swap(r, c, nr, nc);
                    swapped = true;
                    break;
                  }
                }
              }
            }
            if (!swapped) {
              // Just try right neighbor
              if (c + 1 < COLS) swap(r, c, r, c + 1);
            }
            selected = null;
          }
        }
      }
    }
  });

  engine.onRender(() => {
    const ctx = engine.ctx;

    // Background
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(OFFSET_X - 4, OFFSET_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);

    // Grid cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = OFFSET_X + c * CELL;
        const y = OFFSET_Y + r * CELL;

        // Cell bg
        ctx.fillStyle = (r + c) % 2 === 0 ? '#16162a' : '#1a1a30';
        ctx.fillRect(x, y, CELL, CELL);

        const cell = grid[r]?.[c];
        if (!cell || cell.removing) continue;

        const cx = x + CELL / 2;
        const cy = y + CELL / 2 + cell.offsetY;
        const color = COLORS[cell.symbol];

        // Block
        ctx.save();
        const scale = cell.removing ? Math.max(0, cell.removeTimer / 300) : 1;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-CELL / 2 + 3, -CELL / 2 + 3, CELL - 6, CELL - 6, 6);
        ctx.fill();

        // Symbol text
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.floor(CELL * 0.35)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ICONS[cell.symbol], 0, 0);

        ctx.restore();
      }
    }

    // Selection highlight
    if (selected) {
      const sx = OFFSET_X + selected.c * CELL;
      const sy = OFFSET_Y + selected.r * CELL;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 2, sy + 2, CELL - 4, CELL - 4);
    }

    // HUD
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
    ctx.fillText('Arrow keys to move • Z/Enter to swap • Find 3+ matches!', W / 2, H - 10);
  });
}
