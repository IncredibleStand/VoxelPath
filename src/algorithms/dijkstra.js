// ════════════════════════════════════════════════════
//  Dijkstra's Algorithm — guaranteed shortest path
// ════════════════════════════════════════════════════

class MinHeap {
  constructor() { this.heap = []; }
  push(item) { this.heap.push(item); this._up(this.heap.length - 1); }
  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) { this.heap[0] = last; this._down(0); }
    return top;
  }
  get size() { return this.heap.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].dist <= this.heap[i].dist) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let s = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.heap[l].dist < this.heap[s].dist) s = l;
      if (r < n && this.heap[r].dist < this.heap[s].dist) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}

export function runDijkstra(grid) {
  const { startNode, targetNode } = grid;
  const start  = grid.get(startNode.row,  startNode.col);
  const target = grid.get(targetNode.row, targetNode.col);

  const dist     = new Map();
  const cameFrom = new Map();
  const visited  = new Set();
  const heap     = new MinHeap();

  const key = (r, c) => `${r},${c}`;

  dist.set(key(start.row, start.col), 0);
  heap.push({ node: start, dist: 0 });

  const visitedOrder = [];

  while (heap.size > 0) {
    const { node: cur } = heap.pop();
    const ck = key(cur.row, cur.col);

    if (visited.has(ck)) continue;
    visited.add(ck);

    if (cur !== start && cur !== target) {
      visitedOrder.push({ row: cur.row, col: cur.col });
    }

    if (cur.row === target.row && cur.col === target.col) {
      const pathNodes = [];
      let k = key(target.row, target.col);
      while (cameFrom.has(k)) {
        const [pr, pc] = k.split(',').map(Number);
        pathNodes.unshift({ row: pr, col: pc });
        k = cameFrom.get(k);
      }
      return { visitedOrder, pathNodes, found: true };
    }

    for (const nb of grid.getNeighbours(cur.row, cur.col)) {
      const nk  = key(nb.row, nb.col);
      if (visited.has(nk)) continue;
      const d = (dist.get(ck) ?? Infinity) + nb.weight;
      if (d < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, d);
        cameFrom.set(nk, ck);
        heap.push({ node: nb, dist: d });
      }
    }
  }

  return { visitedOrder, pathNodes: [], found: false };
}