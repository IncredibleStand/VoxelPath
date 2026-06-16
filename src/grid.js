// ════════════════════════════════════════════════════
//  LOGICAL GRID — the single source of truth.
//  Three.js reads FROM here; never the other way around.
// ════════════════════════════════════════════════════

export const NODE_TYPES = {
  EMPTY:   'empty',
  WALL:    'wall',
  START:   'start',
  TARGET:  'target',
  VISITED: 'visited',
  PATH:    'path',
};

export class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.cells = [];           // 2-D array [row][col] → { type, weight, scaleY }
    this.startNode  = null;    // { row, col }
    this.targetNode = null;    // { row, col }
    this._init();
  }

  // ─── Init / Reset ────────────────────────────────
  _init() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.cells[r][c] = this._makeNode(r, c, NODE_TYPES.EMPTY);
      }
    }
    // Default start / target positions
    const sr = Math.floor(this.rows / 2);
    const sc = Math.floor(this.cols * 0.15);
    const tr = Math.floor(this.rows / 2);
    const tc = Math.floor(this.cols * 0.85);
    this._setType(sr, sc, NODE_TYPES.START);
    this._setType(tr, tc, NODE_TYPES.TARGET);
    this.startNode  = { row: sr, col: sc };
    this.targetNode = { row: tr, col: tc };
  }

  _makeNode(row, col, type) {
    return {
      row, col,
      type,
      weight: 1,
      scaleY: type === NODE_TYPES.WALL ? 1.8 : 0.3,
      targetScaleY: type === NODE_TYPES.WALL ? 1.8 : 0.3,
      animating: false,
    };
  }

  // ─── Public API ──────────────────────────────────
  get(row, col) {
    if (!this.inBounds(row, col)) return null;
    return this.cells[row][col];
  }

  inBounds(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  index(row, col) {
    return row * this.cols + col;
  }

  setType(row, col, type) {
    if (!this.inBounds(row, col)) return;
    this._setType(row, col, type);
  }

  _setType(row, col, type) {
    const node = this.cells[row][col];
    node.type = type;
    // Walls are tall pillars; everything else is a flat slab
    if (type === NODE_TYPES.WALL) {
      node.targetScaleY = 1.8;
    } else if (type === NODE_TYPES.START || type === NODE_TYPES.TARGET) {
      node.targetScaleY = 0.55;
    } else if (type === NODE_TYPES.VISITED) {
      node.targetScaleY = 0.45;
    } else if (type === NODE_TYPES.PATH) {
      node.targetScaleY = 0.65;
    } else {
      node.targetScaleY = 0.28;
    }
  }

  setStart(row, col) {
    if (this.startNode) {
      this.setType(this.startNode.row, this.startNode.col, NODE_TYPES.EMPTY);
    }
    this.startNode = { row, col };
    this.setType(row, col, NODE_TYPES.START);
  }

  setTarget(row, col) {
    if (this.targetNode) {
      this.setType(this.targetNode.row, this.targetNode.col, NODE_TYPES.EMPTY);
    }
    this.targetNode = { row, col };
    this.setType(row, col, NODE_TYPES.TARGET);
  }

  // Restore grid to blank state, preserving walls
  clearPath() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const node = this.cells[r][c];
        if (node.type === NODE_TYPES.VISITED || node.type === NODE_TYPES.PATH) {
          this._setType(r, c, NODE_TYPES.EMPTY);
        }
      }
    }
    // Re-stamp start/target
    if (this.startNode)  this._setType(this.startNode.row,  this.startNode.col,  NODE_TYPES.START);
    if (this.targetNode) this._setType(this.targetNode.row, this.targetNode.col, NODE_TYPES.TARGET);
  }

  // Full board wipe
  clearBoard() {
    this._init();
  }

  // Resize — creates a brand-new grid
  resize(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this._init();
  }

  // Neighbours (4-directional)
  getNeighbours(row, col) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    return dirs
      .map(([dr, dc]) => this.get(row + dr, col + dc))
      .filter(n => n !== null && n.type !== NODE_TYPES.WALL);
  }

  // 8-directional (for A*)
  getNeighbours8(row, col) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    return dirs
      .map(([dr, dc]) => this.get(row + dr, col + dc))
      .filter(n => n !== null && n.type !== NODE_TYPES.WALL);
  }

  forEach(fn) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        fn(this.cells[r][c], r, c);
      }
    }
  }
}