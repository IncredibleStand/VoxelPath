// ════════════════════════════════════════════════════
//  UI CONTROLLER
//  Binds HUD buttons / sliders to app callbacks.
//  Also exposes toast + status helpers.
// ════════════════════════════════════════════════════

export class UI {
  /**
   * @param {{ onVisualize, onMaze, onClearPath, onClearBoard, onSpeedChange, onGridResize }} handlers
   */
  constructor(handlers) {
    this.handlers = handlers;
    this._bindAll();
  }

  // ─── Getters ──────────────────────────────────────
  get algorithm() { return document.getElementById('algorithm-select').value; }
  get maze()      { return document.getElementById('maze-select').value; }
  get speed()     { return Number(document.getElementById('speed-slider').value); }

  // ─── Bind ─────────────────────────────────────────
  _bindAll() {
    document.getElementById('btn-visualize')
      .addEventListener('click', () => this.handlers.onVisualize?.(this.algorithm));

    document.getElementById('btn-maze')
      .addEventListener('click', () => {
        const type = this.maze;
        if (type === 'none') { this.toast('Select a maze type first.', 'warn'); return; }
        this.handlers.onMaze?.(type);
      });

    document.getElementById('btn-clear-path')
      .addEventListener('click', () => this.handlers.onClearPath?.());

    document.getElementById('btn-clear-board')
      .addEventListener('click', () => this.handlers.onClearBoard?.());

    const speedSlider = document.getElementById('speed-slider');
    speedSlider.addEventListener('input', () => {
      const v = Number(speedSlider.value);
      const labels = { 1: 'Slow', 2: 'Normal', 3: 'Fast' };
      document.getElementById('speed-label').textContent = labels[v] ?? 'Normal';
      this.handlers.onSpeedChange?.(v);
    });

    const gridSlider = document.getElementById('grid-size-slider');
    gridSlider.addEventListener('change', () => {
      const v = Number(gridSlider.value);
      document.getElementById('grid-size-label').textContent = `${v}×${v}`;
      this.handlers.onGridResize?.(v, v);
    });
    gridSlider.addEventListener('input', () => {
      const v = Number(gridSlider.value);
      document.getElementById('grid-size-label').textContent = `${v}×${v}`;
    });

    const btnToggle = document.getElementById('btn-toggle-hud');
    const hudBody = document.getElementById('hud-body');
    const chevron = document.getElementById('hud-chevron');
    let isHudOpen = true;

    btnToggle?.addEventListener('click', () => {
      isHudOpen = !isHudOpen;
      if (isHudOpen) {
        hudBody.classList.remove('max-h-0');
        hudBody.classList.add('max-h-[800px]');
        chevron.classList.remove('rotate-180');
      } else {
        hudBody.classList.remove('max-h-[800px]');
        hudBody.classList.add('max-h-0');
        chevron.classList.add('rotate-180');
      }
    });
  }

  // ─── Lock / Unlock HUD during animation ───────────
  lock() {
    const els = document.querySelectorAll('#btn-visualize, #btn-maze, #btn-clear-board, #algorithm-select, #grid-size-slider');
    els.forEach(el => el.setAttribute('disabled', ''));
    document.getElementById('hud').classList.add('hud-locked');
  }

  unlock() {
    const els = document.querySelectorAll('#btn-visualize, #btn-maze, #btn-clear-board, #algorithm-select, #grid-size-slider');
    els.forEach(el => el.removeAttribute('disabled'));
    document.getElementById('hud').classList.remove('hud-locked');
  }

  // ─── Status badge ─────────────────────────────────
  setStatus(text, mode = 'idle') {
    const badge = document.getElementById('status-badge');
    badge.textContent = text;
    badge.className = 'text-[10px] px-3 py-1 rounded-full border transition-all duration-300 ';
    if (mode === 'running') badge.className += 'status-running';
    else if (mode === 'done') badge.className += 'status-done border-emerald-600 text-emerald-400';
    else if (mode === 'no-path') badge.className += 'status-no-path border-rose-600 text-rose-400';
    else badge.className += 'border-slate-700 text-slate-400';
  }

  // ─── Live stats ───────────────────────────────────
  setStats(visited, path) {
    document.getElementById('stat-visited').textContent = visited;
    document.getElementById('stat-path').textContent    = path;
  }

  // ─── Toast notifications ──────────────────────────
  toast(msg, type = 'info', duration = 2800) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      el.style.opacity    = '0';
      el.style.transform  = 'translateY(8px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  }
}