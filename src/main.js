// ════════════════════════════════════════════════════
//  MAIN — Entry Point
//  Orchestrates: Grid → Scene → Interaction → Animator → UI
// ════════════════════════════════════════════════════

import { Grid, NODE_TYPES } from './grid.js';
import { PathScene }        from './scene.js';
import { Interaction }      from './interaction.js';
import { Animator }         from './animator.js';
import { UI }               from './ui.js';
import { generateMaze }     from './maze.js';
import { runAstar }         from './algorithms/astar.js';
import { runDijkstra }      from './algorithms/dijkstra.js';
import { runBFS, runDFS }   from './algorithms/bfsdfs.js';

// ── 1. Create logical grid ────────────────────────────
const grid = new Grid(30, 30);

// ── 2. Bootstrap Three.js scene ──────────────────────
const canvas = document.getElementById('three-canvas');
const pathScene = new PathScene(canvas, grid);

// ── 3. Cell-changed callback — wires grid → Three.js
function onCellChanged(row, col) {
  pathScene.updateInstance(row, col);
}

// ── 4. Mouse interaction ──────────────────────────────
const interaction = new Interaction(canvas, grid, pathScene, onCellChanged);

// ── 5. Animator ───────────────────────────────────────
const animator = new Animator(grid, pathScene, {
  onStart: () => {
    interaction.lock();
    ui.lock();
    ui.setStatus('RUNNING', 'running');
    ui.setStats(0, 0);
  },
  onFinish: (found) => {
    interaction.unlock();
    ui.unlock();
    if (found) {
      ui.setStatus('PATH FOUND', 'done');
      ui.toast('Shortest path found! ✓', 'success');
    } else {
      ui.setStatus('NO PATH', 'no-path');
      ui.toast('No path exists between Start and Target.', 'warn');
    }
  },
  onStats: ({ visited, path }) => {
    ui.setStats(visited, path);
  },
});

// ── 6. UI controller ──────────────────────────────────
const ui = new UI({
  onVisualize: (algorithm) => {
    if (animator.isRunning) return;

    // Clear previous path visualisation before running
    grid.clearPath();
    pathScene._refreshAll();
    ui.setStats(0, 0);

    // Run selected algorithm synchronously
    let result;
    const t0 = performance.now();
    switch (algorithm) {
      case 'astar':    result = runAstar(grid);    break;
      case 'dijkstra': result = runDijkstra(grid); break;
      case 'bfs':      result = runBFS(grid);      break;
      case 'dfs':      result = runDFS(grid);      break;
      default:         result = runAstar(grid);
    }
    const ms = (performance.now() - t0).toFixed(1);

    const algoNames = { astar: 'A*', dijkstra: "Dijkstra's", bfs: 'BFS', dfs: 'DFS' };
    ui.toast(`${algoNames[algorithm] ?? algorithm} computed in ${ms}ms — animating…`, 'info');

    animator.enqueue(result);
  },

  onMaze: (type) => {
    if (animator.isRunning) return;
    animator.cancel();
    grid.clearBoard();
    const walls = generateMaze(type, grid);
    walls.forEach(({ row, col }) => {
      grid.setType(row, col, NODE_TYPES.WALL);
    });
    pathScene._refreshAll();
    ui.setStats(0, 0);
    ui.setStatus('IDLE', 'idle');
    ui.toast(`Maze generated (${walls.length} walls)`, 'info');
  },

  onClearPath: () => {
    if (animator.isRunning) {
      animator.cancel();
      interaction.unlock();
    }
    grid.clearPath();
    pathScene._refreshAll();
    ui.setStats(0, 0);
    ui.setStatus('IDLE', 'idle');
  },

  onClearBoard: () => {
    if (animator.isRunning) {
      animator.cancel();
      interaction.unlock();
    }
    grid.clearBoard();
    pathScene._refreshAll();
    ui.setStats(0, 0);
    ui.setStatus('IDLE', 'idle');
  },

  onSpeedChange: (level) => {
    animator.setSpeed(level);
  },

  onGridResize: (rows, cols) => {
    if (animator.isRunning) {
      animator.cancel();
      interaction.unlock();
    }
    grid.resize(rows, cols);
    pathScene.rebuild(grid);
    interaction.updateRefs(grid, pathScene);
    animator.updateRefs(grid, pathScene);
    ui.setStats(0, 0);
    ui.setStatus('IDLE', 'idle');
    ui.toast(`Grid resized to ${rows}×${cols}`, 'info');
  },
});

// ── 7. Render loop ────────────────────────────────────
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap at 100ms
  lastTime = timestamp;

  animator.tick(dt);   // drain animation queue
  pathScene.tick(dt);  // lerp animations + render

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// ── 8. Welcome toast ─────────────────────────────────
setTimeout(() => {
  ui.toast('Welcome! Left-click/drag to paint walls. Right-drag to rotate.', 'info', 4500);
}, 400);