// ════════════════════════════════════════════════════
//  A* (A-Star) Pathfinding
//  Uses Manhattan distance heuristic (4-directional)
// ════════════════════════════════════════════════════

function heuristic(a, b) {
  // Manhattan distance
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

class MinHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.heap.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].f <= this.heap[i].f) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].f < this.heap[smallest].f) smallest = l;
      if (r < n && this.heap[r].f < this.heap[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * @param {import('../grid.js').Grid} grid
 * @returns {{ visitedOrder: Array, pathNodes: Array, found: boolean }}
 */
export function runAstar(grid) {
  const { startNode, targetNode } = grid;
  const start  = grid.get(startNode.row,  startNode.col);
  const target = grid.get(targetNode.row, targetNode.col);

  const openSet  = new MinHeap();
  const gScore   = new Map();   // "row,col" → g cost
  const fScore   = new Map();
  const cameFrom = new Map();
  const visited  = new Set();

  const key = (r, c) => `${r},${c}`;

  gScore.set(key(start.row, start.col), 0);
  const startF = heuristic(start, target);
  fScore.set(key(start.row, start.col), startF);
  openSet.push({ node: start, f: startF });

  const visitedOrder = [];

  while (openSet.size > 0) {
    const { node: current } = openSet.pop();
    const ck = key(current.row, current.col);

    if (visited.has(ck)) continue;
    visited.add(ck);

    // Don't mark start/target as "visited" for coloring purposes
    if (current !== start && current !== target) {
      visitedOrder.push({ row: current.row, col: current.col });
    }

    if (current.row === target.row && current.col === target.col) {
      // Reconstruct path
      const pathNodes = [];
      let cur = key(target.row, target.col);
      while (cameFrom.has(cur)) {
        const [pr, pc] = cur.split(',').map(Number);
        pathNodes.unshift({ row: pr, col: pc });
        cur = cameFrom.get(cur);
      }
      return { visitedOrder, pathNodes, found: true };
    }

    const neighbours = grid.getNeighbours(current.row, current.col);
    for (const neighbour of neighbours) {
      const nk = key(neighbour.row, neighbour.col);
      if (visited.has(nk)) continue;

      const tentativeG = (gScore.get(ck) ?? Infinity) + neighbour.weight;
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, ck);
        gScore.set(nk, tentativeG);
        const f = tentativeG + heuristic(neighbour, target);
        fScore.set(nk, f);
        openSet.push({ node: neighbour, f });
      }
    }
  }

  return { visitedOrder, pathNodes: [], found: false };
}