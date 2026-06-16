// ════════════════════════════════════════════════════
//  BFS — Breadth-First Search (guaranteed shortest)
//  DFS — Depth-First Search   (not guaranteed shortest)
// ════════════════════════════════════════════════════

const key = (r, c) => `${r},${c}`;

function reconstructPath(cameFrom, target) {
  const pathNodes = [];
  let k = key(target.row, target.col);
  while (cameFrom.has(k)) {
    const [r, c] = k.split(',').map(Number);
    pathNodes.unshift({ row: r, col: c });
    k = cameFrom.get(k);
  }
  return pathNodes;
}

export function runBFS(grid) {
  const { startNode, targetNode } = grid;
  const start  = grid.get(startNode.row,  startNode.col);
  const target = grid.get(targetNode.row, targetNode.col);

  const queue     = [start];
  const visited   = new Set([key(start.row, start.col)]);
  const cameFrom  = new Map();
  const visitedOrder = [];

  while (queue.length) {
    const cur = queue.shift();

    if (cur !== start && cur !== target) {
      visitedOrder.push({ row: cur.row, col: cur.col });
    }

    if (cur.row === target.row && cur.col === target.col) {
      return { visitedOrder, pathNodes: reconstructPath(cameFrom, target), found: true };
    }

    for (const nb of grid.getNeighbours(cur.row, cur.col)) {
      const nk = key(nb.row, nb.col);
      if (!visited.has(nk)) {
        visited.add(nk);
        cameFrom.set(nk, key(cur.row, cur.col));
        queue.push(nb);
      }
    }
  }

  return { visitedOrder, pathNodes: [], found: false };
}

export function runDFS(grid) {
  const { startNode, targetNode } = grid;
  const start  = grid.get(startNode.row,  startNode.col);
  const target = grid.get(targetNode.row, targetNode.col);

  const stack    = [start];
  const visited  = new Set();
  const cameFrom = new Map();
  const visitedOrder = [];

  while (stack.length) {
    const cur = stack.pop();
    const ck  = key(cur.row, cur.col);

    if (visited.has(ck)) continue;
    visited.add(ck);

    if (cur !== start && cur !== target) {
      visitedOrder.push({ row: cur.row, col: cur.col });
    }

    if (cur.row === target.row && cur.col === target.col) {
      return { visitedOrder, pathNodes: reconstructPath(cameFrom, target), found: true };
    }

    for (const nb of grid.getNeighbours(cur.row, cur.col)) {
      const nk = key(nb.row, nb.col);
      if (!visited.has(nk)) {
        cameFrom.set(nk, ck);
        stack.push(nb);
      }
    }
  }

  return { visitedOrder, pathNodes: [], found: false };
}