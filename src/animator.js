// ════════════════════════════════════════════════════
//  ANIMATOR — Animation Queue Manager
//
//  The algorithm runs synchronously to completion and
//  pushes steps to the queue. The render loop drains
//  the queue at a speed controlled by the user.
// ════════════════════════════════════════════════════

import { NODE_TYPES } from './grid.js';

const STEPS_PER_SECOND = {
  1: 8,    // Slow
  2: 60,   // Normal
  3: 400,  // Fast
};

export class Animator {
  /**
   * @param {import('./grid.js').Grid} grid
   * @param {import('./scene.js').PathScene} scene
   * @param {{ onStart, onFinish, onStats }} callbacks
   */
  constructor(grid, scene, callbacks = {}) {
    this.grid      = grid;
    this.scene     = scene;
    this.callbacks = callbacks;

    this._queue      = [];          // { type: 'visited'|'path', row, col }
    this._running    = false;
    this._speed      = 2;           // 1|2|3
    this._accumSteps = 0;           // fractional step accumulator
    this._visitedCount = 0;
    this._pathCount    = 0;
  }

  // ─── Public ───────────────────────────────────────
  get isRunning() { return this._running; }

  setSpeed(level) { this._speed = level; }

  updateRefs(grid, scene) {
    this.grid  = grid;
    this.scene = scene;
  }

  /**
   * Build the animation queue from algorithm output then start draining.
   * @param {{ visitedOrder: Array, pathNodes: Array, found: boolean }} result
   */
  enqueue(result) {
    this._queue = [];
    this._visitedCount = 0;
    this._pathCount    = 0;

    for (const { row, col } of result.visitedOrder) {
      this._queue.push({ type: 'visited', row, col });
    }

    if (result.found) {
      for (const { row, col } of result.pathNodes) {
        this._queue.push({ type: 'path', row, col });
      }
    } else {
      // Signal no-path at end
      this._queue.push({ type: 'no_path' });
    }

    this._running    = true;
    this._accumSteps = 0;
    this.callbacks.onStart?.();
  }

  /**
   * Called every frame from the render loop.
   * @param {number} dt  delta time in seconds
   */
  tick(dt) {
    if (!this._running || this._queue.length === 0) return;

    const stepsPerSec = STEPS_PER_SECOND[this._speed] ?? 60;
    this._accumSteps += stepsPerSec * dt;
    const toProcess = Math.floor(this._accumSteps);
    this._accumSteps -= toProcess;

    for (let i = 0; i < toProcess; i++) {
      if (this._queue.length === 0) {
        this._finish();
        return;
      }

      const step = this._queue.shift();

      if (step.type === 'visited') {
        this._visitedCount++;
        const node = this.grid.get(step.row, step.col);
        if (node && node.type === NODE_TYPES.EMPTY) {
          this.grid.setType(step.row, step.col, NODE_TYPES.VISITED);
          this.scene.updateInstance(step.row, step.col);
        }
      } else if (step.type === 'path') {
        this._pathCount++;
        const node = this.grid.get(step.row, step.col);
        if (node && (node.type === NODE_TYPES.VISITED || node.type === NODE_TYPES.EMPTY)) {
          this.grid.setType(step.row, step.col, NODE_TYPES.PATH);
          this.scene.updateInstance(step.row, step.col);
        }
      } else if (step.type === 'no_path') {
        this._finish(false);
        return;
      }

      // Update live stats
      this.callbacks.onStats?.({ visited: this._visitedCount, path: this._pathCount });
    }

    if (this._queue.length === 0) {
      this._finish(true);
    }
  }

  _finish(found = true) {
    this._running = false;
    this.callbacks.onFinish?.(found);
  }

  cancel() {
    this._queue   = [];
    this._running = false;
  }
}