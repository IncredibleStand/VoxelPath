// ════════════════════════════════════════════════════
//  MAZE GENERATORS
//  Returns an array of wall positions: [{row, col}, ...]
//  Caller is responsible for applying them to the grid.
// ════════════════════════════════════════════════════

import { NODE_TYPES } from './grid.js';

// ── helpers ──────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function isSafe(grid, row, col) {
  // Don't wall over start/target
  const t = grid.get(row, col)?.type;
  return t !== NODE_TYPES.START && t !== NODE_TYPES.TARGET;
}

// ── 1. Random Scatter ─────────────────────────────────
export function generateRandomScatter(grid, density = 0.32) {
  const walls = [];
  grid.forEach((node, r, c) => {
    if (!isSafe(grid, r, c)) return;
    if (Math.random() < density) walls.push({ row: r, col: c });
  });
  return walls;
}

// ── 2. Recursive Division ─────────────────────────────
export function generateRecursiveDivision(grid) {
  const walls = [];

  function addHWall(rMin, rMax, cMin, cMax) {
    if (rMax - rMin < 2 || cMax - cMin < 2) return;

    // Pick a random even row for the wall
    const wallRow = rand(rMin + 1, rMax - 1);
    // Pick a random odd column for the passage
    const passage = rand(cMin, cMax);

    for (let c = cMin; c <= cMax; c++) {
      if (c !== passage && isSafe(grid, wallRow, c)) {
        walls.push({ row: wallRow, col: c });
      }
    }

    addVWall(rMin, wallRow - 1, cMin, cMax);
    addVWall(wallRow + 1, rMax,  cMin, cMax);
  }

  function addVWall(rMin, rMax, cMin, cMax) {
    if (rMax - rMin < 2 || cMax - cMin < 2) return;

    const wallCol  = rand(cMin + 1, cMax - 1);
    const passage  = rand(rMin, rMax);

    for (let r = rMin; r <= rMax; r++) {
      if (r !== passage && isSafe(grid, r, wallCol)) {
        walls.push({ row: r, col: wallCol });
      }
    }

    addHWall(rMin, rMax, cMin, wallCol - 1);
    addHWall(rMin, rMax, wallCol + 1, cMax);
  }

  // Start with horizontal divide if grid is wide
  if (grid.cols >= grid.rows) {
    addHWall(0, grid.rows - 1, 0, grid.cols - 1);
  } else {
    addVWall(0, grid.rows - 1, 0, grid.cols - 1);
  }

  return walls;
}

// ── 3. Spiral Maze ────────────────────────────────────
export function generateSpiral(grid) {
  const walls = [];
  const cx = Math.floor(grid.cols / 2);
  const cy = Math.floor(grid.rows / 2);
  const maxR = Math.min(cx, cy);

  for (let radius = 2; radius < maxR; radius += 3) {
    // Draw a square ring with one gap
    const top    = cy - radius;
    const bottom = cy + radius;
    const left   = cx - radius;
    const right  = cx + radius;

    // Pick a random side for the gap
    const gapSide = rand(0, 3);
    const gapPos  = gapSide < 2
      ? rand(left + 1, right - 1)
      : rand(top + 1, bottom - 1);

    // Top
    for (let c = left; c <= right; c++) {
      if (gapSide === 0 && c === gapPos) continue;
      if (grid.inBounds(top, c) && isSafe(grid, top, c))
        walls.push({ row: top, col: c });
    }
    // Bottom
    for (let c = left; c <= right; c++) {
      if (gapSide === 1 && c === gapPos) continue;
      if (grid.inBounds(bottom, c) && isSafe(grid, bottom, c))
        walls.push({ row: bottom, col: c });
    }
    // Left
    for (let r = top + 1; r < bottom; r++) {
      if (gapSide === 2 && r === gapPos) continue;
      if (grid.inBounds(r, left) && isSafe(grid, r, left))
        walls.push({ row: r, col: left });
    }
    // Right
    for (let r = top + 1; r < bottom; r++) {
      if (gapSide === 3 && r === gapPos) continue;
      if (grid.inBounds(r, right) && isSafe(grid, r, right))
        walls.push({ row: r, col: right });
    }
  }
  return walls;
}

// ── Router ────────────────────────────────────────────
export function generateMaze(type, grid) {
  switch (type) {
    case 'recursive': return generateRecursiveDivision(grid);
    case 'scatter':   return generateRandomScatter(grid);
    case 'spiral':    return generateSpiral(grid);
    default:          return [];
  }
}