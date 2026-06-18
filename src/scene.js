// ════════════════════════════════════════════════════
//  THREE.JS SCENE
//  - InstancedMesh (single draw call for all nodes)
//  - OrbitControls
//  - AmbientLight + DirectionalLight with shadows
//  - Per-frame lerp animation for scaleY
// ════════════════════════════════════════════════════

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NODE_TYPES } from './grid.js';

// ── Palette ───────────────────────────────────────────
const COLORS = {
  [NODE_TYPES.EMPTY]:   new THREE.Color('#1e2d45'), // Legend: bg-[#1e2d45]
  [NODE_TYPES.WALL]:    new THREE.Color('#94a3b8'), // Legend: bg-slate-400
  [NODE_TYPES.START]:   new THREE.Color('#34d399'), // Legend: bg-emerald-400
  [NODE_TYPES.TARGET]:  new THREE.Color('#f43f5e'), // Legend: bg-rose-500
  [NODE_TYPES.VISITED]: new THREE.Color('#22d3ee'), // Legend: bg-cyan-400
  [NODE_TYPES.PATH]:    new THREE.Color('#fcd34d'), // Legend: bg-amber-300
};

const LERP_SPEED = 12;  // per-second lerp factor for scaleY

export class PathScene {
  constructor(canvas, grid) {
    this.canvas  = canvas;
    this.grid    = grid;
    this._tmpMat = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQ   = new THREE.Quaternion();
    this._tmpS   = new THREE.Vector3();
    this._tmpColor = new THREE.Color();

    this._setup();
    this._buildInstancedMesh();
    this._refreshAll();
  }

  // ─── Scene bootstrap ──────────────────────────────
  _setup() {
    const w = window.innerWidth, h = window.innerHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // Scene + fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#040c18');
    this.scene.fog = new THREE.FogExp2('#040c18', 0.012);

    // Camera — isometric-ish perspective
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this._resetCamera();

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance   = 5;
    this.controls.maxDistance   = 120;
    this.controls.mouseButtons  = {
      LEFT:   THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT:  THREE.MOUSE.ROTATE,
    };

    // Lights
    const ambient = new THREE.AmbientLight('#334155', 1.8);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight('#bae6fd', 3.0);
    sun.position.set(30, 60, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far  = 200;
    const s = 80;
    sun.shadow.camera.left   = -s;
    sun.shadow.camera.right  =  s;
    sun.shadow.camera.top    =  s;
    sun.shadow.camera.bottom = -s;
    this.scene.add(sun);

    // Rim light
    const rim = new THREE.DirectionalLight('#7c3aed', 2.0);
    rim.position.set(-30, 20, -40);
    this.scene.add(rim);

    // Base plane (receives shadows)
    const planeGeo = new THREE.PlaneGeometry(1000, 1000);
    const planeMat = new THREE.MeshLambertMaterial({ color: '#020d1a' });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.01;
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Grid line helper (subtle)
    this._addGridLines();

    // Resize handler
    window.addEventListener('resize', () => this._onResize());
  }

  _resetCamera() {
    const cx = (this.grid.cols * 1.0) / 2;
    const cz = (this.grid.rows * 1.0) / 2;
    this.camera.position.set(cx + 20, 28, cz + 28);
    this.camera.lookAt(cx, 0, cz);
    if (this.controls) {
      this.controls.target.set(cx, 0, cz);
    }
  }

  _addGridLines() {
    if (this._gridLinesMesh) this.scene.remove(this._gridLinesMesh);

    const rows = this.grid.rows, cols = this.grid.cols;
    const points = [];
    const CELL = 1.0;

    for (let r = 0; r <= rows; r++) {
      points.push(new THREE.Vector3(0,      0.01, r * CELL));
      points.push(new THREE.Vector3(cols * CELL, 0.01, r * CELL));
    }
    for (let c = 0; c <= cols; c++) {
      points.push(new THREE.Vector3(c * CELL, 0.01, 0));
      points.push(new THREE.Vector3(c * CELL, 0.01, rows * CELL));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: '#0e2a45', transparent: true, opacity: 0.5 });
    this._gridLinesMesh = new THREE.LineSegments(geo, mat);
    this.scene.add(this._gridLinesMesh);
  }

// ─── InstancedMesh ────────────────────────────────
  _buildInstancedMesh() {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.material.dispose();
    }

    const count = this.grid.rows * this.grid.cols;

    const geo = new THREE.BoxGeometry(0.88, 1, 0.88);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.1,
      metalness: 0.1,  
      vertexColors: false,
    });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, count);
    this.instancedMesh.castShadow    = true;
    this.instancedMesh.receiveShadow = true;
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.instancedMesh);
  }

  // ─── Rebuild after grid resize ────────────────────
  rebuild(grid) {
    this.grid = grid;
    this._buildInstancedMesh();
    this._addGridLines();
    this._resetCamera();
    this._refreshAll();
  }

  // ─── Full sync of all instances ──────────────────
  _refreshAll() {
    this.grid.forEach((node, r, c) => {
      const i = this.grid.index(r, c);
      // Sync scaleY from logical state
      const sy = node.type === NODE_TYPES.WALL ? 1.8
               : node.type === NODE_TYPES.START || node.type === NODE_TYPES.TARGET ? 0.55
               : 0.28;
      node.scaleY = sy;
      node.targetScaleY = sy;
      this._applyInstance(i, r, c, node.scaleY, COLORS[node.type] ?? COLORS[NODE_TYPES.EMPTY]);
    });
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate  = true;
  }

  // Update a single instance (called by animator)
  updateInstance(row, col) {
    const node = this.grid.get(row, col);
    if (!node) return;
    const i = this.grid.index(row, col);
    const color = COLORS[node.type] ?? COLORS[NODE_TYPES.EMPTY];
    this._applyInstance(i, row, col, node.scaleY, color);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor.needsUpdate  = true;
  }

  _applyInstance(index, row, col, scaleY, color) {
    // Cells are 1×1 world units; pivot is at center
    this._tmpPos.set(col + 0.5, scaleY / 2, row + 0.5);
    this._tmpS.set(1, scaleY, 1);
    this._tmpMat.compose(this._tmpPos, this._tmpQ, this._tmpS);
    this.instancedMesh.setMatrixAt(index, this._tmpMat);
    this.instancedMesh.setColorAt(index, color);
  }

  // ─── Per-frame lerp animation + controls ──────────
  tick(dt) {
    let needsUpdate = false;
    const LERP = Math.min(1, LERP_SPEED * dt);

    this.grid.forEach((node, r, c) => {
      const diff = node.targetScaleY - node.scaleY;
      if (Math.abs(diff) > 0.001) {
        node.scaleY += diff * LERP;
        node.animating = true;
        const i = this.grid.index(r, c);
        const color = COLORS[node.type] ?? COLORS[NODE_TYPES.EMPTY];
        this._applyInstance(i, r, c, node.scaleY, color);
        needsUpdate = true;
      } else if (node.animating) {
        node.scaleY = node.targetScaleY;
        node.animating = false;
        const i = this.grid.index(r, c);
        const color = COLORS[node.type] ?? COLORS[NODE_TYPES.EMPTY];
        this._applyInstance(i, r, c, node.scaleY, color);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMesh.instanceColor.needsUpdate  = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ─── Raycasting ───────────────────────────────────
  getIntersection(normalizedX, normalizedY) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(normalizedX, normalizedY);
    raycaster.setFromCamera(mouse, this.camera);
    const hits = raycaster.intersectObject(this.instancedMesh);
    if (hits.length === 0) return null;
    const hit = hits[0];
    const instanceId = hit.instanceId;
    const row = Math.floor(instanceId / this.grid.cols);
    const col = instanceId % this.grid.cols;
    return { row, col, instanceId };
  }

  // ─── Resize ───────────────────────────────────────
  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}