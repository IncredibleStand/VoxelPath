// ════════════════════════════════════════════════════
//  INTERACTION — Raycasting + mouse state machine
//  Separation of concerns: only mutates the logical
//  Grid; Scene.updateInstance() is called after.
// ════════════════════════════════════════════════════

import { NODE_TYPES } from './grid.js';

const DRAG_MODE = {
  NONE:        'none',
  PAINT_WALL:  'paint_wall',
  ERASE_WALL:  'erase_wall',
  MOVE_START:  'move_start',
  MOVE_TARGET: 'move_target',
};

export class Interaction {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./grid.js').Grid} grid
   * @param {import('./scene.js').PathScene} pathScene
   * @param {(r:number,c:number)=>void} onCellChanged  — triggers a 3-D update
   */
  constructor(canvas, grid, pathScene, onCellChanged) {
    this.canvas         = canvas;
    this.grid           = grid;
    this.pathScene      = pathScene;
    this.onCellChanged  = onCellChanged;
    this.locked         = false;  // set true while animation runs

    this._mode          = DRAG_MODE.NONE;
    this._mouseDown     = false;
    this._lastRC        = null;   // { row, col } of last painted cell

    this._bindEvents();
  }

  // ─── Public ───────────────────────────────────────
  lock()   { this.locked = true;  }
  unlock() { this.locked = false; }

  updateRefs(grid, pathScene) {
    this.grid      = grid;
    this.pathScene = pathScene;
  }

  // ─── Events ───────────────────────────────────────
  _bindEvents() {
    this.canvas.addEventListener('mousedown',  e => this._onDown(e));
    this.canvas.addEventListener('mousemove',  e => this._onMove(e));
    this.canvas.addEventListener('mouseup',    e => this._onUp(e));
    this.canvas.addEventListener('mouseleave', e => this._onUp(e));

    // Touch support
    this.canvas.addEventListener('touchstart',  e => this._onDown(this._touchToMouse(e)), { passive: false });
    this.canvas.addEventListener('touchmove',   e => this._onMove(this._touchToMouse(e)), { passive: false });
    this.canvas.addEventListener('touchend',    e => this._onUp(e));
  }

  _touchToMouse(e) {
    e.preventDefault();
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY, button: 0 };
  }

  _normalize(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x:  ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      y: -((e.clientY - rect.top)  / rect.height) * 2 + 1,
    };
  }

  _onDown(e) {
    if (e.button !== 0) return;   // left-click only
    if (this.locked) return;

    this._mouseDown = true;
    const ndc = this._normalize(e);
    const hit = this.pathScene.getIntersection(ndc.x, ndc.y);
    if (!hit) { this._mode = DRAG_MODE.NONE; return; }

    const { row, col } = hit;
    const node = this.grid.get(row, col);
    if (!node) return;

    if (node.type === NODE_TYPES.START) {
      this._mode = DRAG_MODE.MOVE_START;
    } else if (node.type === NODE_TYPES.TARGET) {
      this._mode = DRAG_MODE.MOVE_TARGET;
    } else if (node.type === NODE_TYPES.WALL) {
      this._mode = DRAG_MODE.ERASE_WALL;
      this._applyErase(row, col);
    } else {
      this._mode = DRAG_MODE.PAINT_WALL;
      this._applyPaint(row, col);
    }

    this._lastRC = { row, col };
  }

  _onMove(e) {
    if (!this._mouseDown || this._mode === DRAG_MODE.NONE) return;
    if (this.locked) return;

    const ndc = this._normalize(e);
    const hit = this.pathScene.getIntersection(ndc.x, ndc.y);
    if (!hit) return;

    const { row, col } = hit;
    if (this._lastRC && this._lastRC.row === row && this._lastRC.col === col) return;
    this._lastRC = { row, col };

    const node = this.grid.get(row, col);
    if (!node) return;

    switch (this._mode) {
      case DRAG_MODE.PAINT_WALL:
        if (node.type === NODE_TYPES.EMPTY || node.type === NODE_TYPES.VISITED || node.type === NODE_TYPES.PATH)
          this._applyPaint(row, col);
        break;
      case DRAG_MODE.ERASE_WALL:
        if (node.type === NODE_TYPES.WALL)
          this._applyErase(row, col);
        break;
      case DRAG_MODE.MOVE_START:
        if (node.type !== NODE_TYPES.TARGET && node.type !== NODE_TYPES.WALL) {
          const prev = this.grid.startNode;
          this.grid.setStart(row, col);
          this.onCellChanged(prev.row, prev.col);
          this.onCellChanged(row, col);
        }
        break;
      case DRAG_MODE.MOVE_TARGET:
        if (node.type !== NODE_TYPES.START && node.type !== NODE_TYPES.WALL) {
          const prev = this.grid.targetNode;
          this.grid.setTarget(row, col);
          this.onCellChanged(prev.row, prev.col);
          this.onCellChanged(row, col);
        }
        break;
    }
  }

  _onUp(_e) {
    this._mouseDown = false;
    this._mode      = DRAG_MODE.NONE;
    this._lastRC    = null;
  }

  // ─── Grid mutations ───────────────────────────────
  _applyPaint(row, col) {
    this.grid.setType(row, col, NODE_TYPES.WALL);
    this.onCellChanged(row, col);
  }

  _applyErase(row, col) {
    this.grid.setType(row, col, NODE_TYPES.EMPTY);
    this.onCellChanged(row, col);
  }
}