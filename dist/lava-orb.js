/**
 * lava-orb — temperature-reactive liquid capsule effect for range sliders
 * Version: 3.0.0-alpha.1
 * License: MIT
 * Built: 2026-04-19T15:38:57.376Z
 */
(function(window) {
"use strict";

// ========== core/palettes.js ==========
// Palettes — color schemes for 10 temperature states + DOOM fire.

// Light theme — cool blue (cold) → fiery red (hot). Each entry: [fill-top, fill-mid, dark, border]
const SLIDER_PALETTE_LIGHT = [
  null,
  ['#6494ED', '#8AB4FF', '#2A4480', '#4A74CD'],
  ['#5A9DE6', '#7CB8F0', '#1A5090', '#3A7DC6'],
  ['#4FB8D0', '#6FD8E8', '#1A6878', '#3098B0'],
  ['#45C4AA', '#65E4CA', '#0A6050', '#25A48A'],
  ['#4ABA7A', '#6ADA9A', '#0A5A30', '#2A9A5A'],
  ['#7AB648', '#9AD668', '#3A5610', '#5A9628'],
  ['#B5A234', '#D5C254', '#5A4A08', '#958214'],
  ['#E09028', '#FFB848', '#6A3000', '#C07010'],
  ['#E8703A', '#FF9060', '#6A2008', '#C8501A'],
  ['#E05A5A', '#FF7A7A', '#6A1010', '#C03A3A']
];

// Dark theme — more saturated shades for contrast on dark backgrounds
const SLIDER_PALETTE_DARK = [
  null,
  ['#7BAAF0', '#A0C8FF', '#2A4490', '#5B8AD0'],
  ['#6DB5E8', '#90D0FF', '#1A5898', '#4D95C8'],
  ['#5CC8D8', '#80E0F0', '#1A7080', '#3CA8B8'],
  ['#50D4B5', '#78F0D8', '#106850', '#30B495'],
  ['#56CC88', '#78ECA8', '#106838', '#36AC68'],
  ['#88C856', '#A8E876', '#406018', '#68A836'],
  ['#C4B240', '#E8D860', '#5A4A08', '#A49220'],
  ['#ECA040', '#FFC060', '#704000', '#CC8020'],
  ['#F08050', '#FFA070', '#702810', '#D06030'],
  ['#F06868', '#FF9090', '#701818', '#D04848']
];

// DOOM fire palette — 37 colors of cellular automaton (black → red → orange → yellow → white)
const FIRE_PALETTE = [
  [  7,  7,  7], [ 31,  7,  7], [ 47, 15,  7], [ 71, 15,  7],
  [ 87, 23,  7], [103, 31,  7], [119, 31,  7], [143, 39,  7],
  [159, 47,  7], [175, 63,  7], [191, 71,  7], [199, 71,  7],
  [223, 79,  7], [223, 87,  7], [223, 87,  7], [215, 95,  7],
  [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15],
  [207, 135, 23], [199, 135, 23], [199, 143, 23], [199, 151, 31],
  [191, 159, 31], [191, 159, 31], [191, 167, 39], [191, 167, 39],
  [191, 175, 47], [183, 175, 47], [183, 183, 47], [183, 183, 55],
  [200, 180, 70], [210, 190, 85], [215, 200, 100], [220, 205, 120],
  [228, 210, 140]
];

// Frost palette — 24 colors (black → blue → icy → white)
const FROST_PALETTE = [
  [  5,  5, 15], [  8, 12, 30], [ 12, 20, 50], [ 15, 30, 70],
  [ 20, 40, 90], [ 25, 55, 115], [ 30, 70, 140], [ 40, 85, 160],
  [ 50, 100, 180], [ 60, 115, 195], [ 75, 130, 210], [ 90, 150, 220],
  [110, 170, 230], [130, 185, 235], [150, 200, 240], [170, 210, 245],
  [185, 220, 248], [200, 230, 250], [210, 235, 252], [220, 240, 253],
  [230, 245, 254], [240, 250, 255], [248, 253, 255], [255, 255, 255]
];

/**
 * Get 4-color palette for val (1-10) with theme awareness.
 * @param {number} val — slider value 1-10
 * @param {boolean} isDark — dark theme flag
 * @returns {string[]} array of 4 hex color strings
 */
function getPalette(val, isDark) {
  const pal = isDark ? SLIDER_PALETTE_DARK : SLIDER_PALETTE_LIGHT;
  const clamped = Math.max(1, Math.min(10, Math.round(val)));
  return pal[clamped] || pal[5];
}

/**
 * Primary badge color for val (first color in palette).
 */
function getBadgeColor(val, isDark) {
  return getPalette(val, isDark)[0];
}

// ========== core/temp-params.js ==========
// tempParams(val) — liquid/fire/frost parameters for each value 1-10.
// Pure mapping function with no dependencies.

/**
 * @typedef {Object} TempParams
 * @property {number}  fill          — liquid fill ratio (0-1)
 * @property {number}  amp           — wave amplitude
 * @property {number}  speed         — animation speed multiplier
 * @property {number}  embers        — ember particle count inside orb
 * @property {boolean} frost         — frost mode (val 1-2)
 * @property {boolean} fire          — fire mode (val 7-10)
 * @property {number}  fireIntensity — fire intensity 0-1 (smooth gradient)
 * @property {number}  bubble        — bubble intensity 0-1
 */

/**
 * Return TempParams for the given value (1-10).
 * @param {number} val
 * @returns {TempParams}
 */
function tempParams(val) {
  // fireIntensity 0-1 — smooth gradient for fire starting at val 7.
  // Avoids the abrupt on/off transition between val 8 and val 9.
  if (val <= 1) return { fill: 0.45, amp: 0,   speed: 0,   embers: 0,  frost: true,  fire: false, fireIntensity: 0,    bubble: 0 };
  if (val <= 2) return { fill: 0.40, amp: 0.8, speed: 0.3, embers: 0,  frost: true,  fire: false, fireIntensity: 0,    bubble: 0 };
  if (val <= 3) return { fill: 0.42, amp: 1.2, speed: 0.5, embers: 0,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.1 };
  if (val <= 4) return { fill: 0.44, amp: 1.8, speed: 0.7, embers: 1,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.2 };
  if (val <= 5) return { fill: 0.48, amp: 2.5, speed: 1.0, embers: 3,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.3 };
  if (val <= 6) return { fill: 0.50, amp: 3.0, speed: 1.2, embers: 4,  frost: false, fire: false, fireIntensity: 0.05, bubble: 0.4 };
  if (val <= 7) return { fill: 0.54, amp: 3.5, speed: 1.5, embers: 5,  frost: false, fire: true,  fireIntensity: 0.25, bubble: 0.6 };
  if (val <= 8) return { fill: 0.58, amp: 4.2, speed: 1.8, embers: 6,  frost: false, fire: true,  fireIntensity: 0.50, bubble: 0.8 };
  if (val <= 9) return { fill: 0.65, amp: 5.0, speed: 2.3, embers: 8,  frost: false, fire: true,  fireIntensity: 0.75, bubble: 0.9 };
  return              { fill: 0.78, amp: 6.5, speed: 3.0, embers: 12, frost: false, fire: true,  fireIntensity: 1.0,  bubble: 1.0 };
}

// ========== core/config.js ==========
// Default configs — copied from ver3a. User can override via options in attach().

/** Global tuning parameters for visuals/physics. */
const TUNE_DEFAULTS = {
  speed: 1.0,         // animation speed multiplier
  intensity: 1.0,     // fire/frost intensity
  fxRadius: 0.6,      // FX radius as fraction of fire-canvas
  gravity: 0.15,      // gravity for drops and detached orbs
  particles: 60,      // particle pool size
  sloshing: 1.0,      // liquid sloshing force on movement
  bounce: 0.65,       // floor bounce restitution
  trail: 1.5,         // fire trail multiplier

  // Explosion
  blastPower: 1.0,
  fireball: 120,
  shockwave: 350,
  shake: 0.8,
  flash: 0.9,
  debris: 15,
  smoke: 18,
  sparks: 50,

  // Collision
  colDist: 0.9,
  colElastic: 0.8,
  colBlast: 40,
  colCooldown: 30,
  hotThresh: 7,
  coldThresh: 3,
  colHotColdEnabled: 1,
  colHotHotEnabled: 1,
  colColdColdEnabled: 1,
  colHotHotForce: 20,
  colHotHotCooldown: 15,
  colColdColdForce: 12,
  colColdColdCooldown: 20,
  colMergeEnabled: 1,
  colMergeSpeedThresh: 6,
  colMergeDuration: 150,
  colMergeForce: 10
};

/** Fire config (particle path + DOOM). */
const FIRE_DEFAULTS = {
  fire: true,
  smokeMove: true,
  smokeIdle: false,
  sparks: true,
  maxParticles: 261,
  sparkRate: 4,
  fadeAlpha: 0.2,
  baseSize: 19,
  baseLife: 10,
  turbulence: 0.1,
  taper: 0,
  flameHeight: 0.5,
  flameWidth: 0.2,
  spawnArc: 360,
  spawnOffset: 0.9,
  buoyancy: 0,
  glowIntensity: 0,
  glowSize: 2.5,
  fireSpeed: 0.7,
  smokeSize: 14,
  smokeHeight: 1.9,
  smokePuff: 2,

  // DOOM mode (from ver1)
  style: 'particles',  // 'particles' | 'doom'
  doomRes: 2,
  doomIntensity: 1.0,
  doomTrailPower: 1.0
};

/** Liquid config. Working params marked ✓, TODO — not implemented. */
const LIQUID_DEFAULTS = {
  fill: 0,           // ✓ Fill override (0 = use tempParams, >0 = absolute value)
  cols: 24,          // ✓ Wave column count
  spring: 0.05,      // ✓ Wave spring strength
  damping: 0.975,    // ✓ Wave damping
  spread: 0.25,      // ✓ Wave propagation between neighbors
  substeps: 4,       // ✓ Physics substeps per frame
  layers: 3,         // ✓ Gradient layer count (1-5)
  surfaceGlow: true, // ✓ Surface glow at val >= 5
  embers: true,      // ✓ Ember particles inside orb
  bubbles: true,     // ✓ Bubbles in liquid
  cracks: 4,         // ✓ Glass cracks at val 1 and 10
  glass: true,       // ✓ Glass highlight + rim

  sloshing: 1.2,     // TODO: currently TUNE.sloshing is used
  innerSplash: 10,   // TODO: inner fountain on click
  outerSplash: 5     // TODO: outer splash on impact
};

/** Performance tuning (auto-adaptation). */
const PERF_DEFAULTS = {
  gradCutoff: 3.0,    // particle size below which flat circle is used (no radialGradient)
  shadowBlur: 1.0,    // shadowBlur multiplier (0 = disabled)
  viewportCull: true  // skip rendering orbs outside viewport
};

/**
 * Shallow copy defaults (so mutations don't break the source).
 */
function cloneConfig(defaults) {
  const out = {};
  for (const k in defaults) out[k] = defaults[k];
  return out;
}

// ========== core/helpers.js ==========
// Helpers — math + particle pool API + pre-rendered sprites.

/**
 * Linear interpolation between two angles (with ±π wrap handling).
 */
function blendAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/** clamp(x, min, max) */
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

// ========== Particle pool API ==========
// Pool = plain Array. An `active: true/false` flag on objects controls lifecycle.
// poolAlloc — find free slot or push new. Returns the object to populate.
// poolKill — mark as inactive (reusable).
// poolCount — count active.

function poolAlloc(pool, obj) {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) {
      Object.assign(pool[i], obj);
      pool[i].active = true;
      return pool[i];
    }
  }
  obj.active = true;
  pool.push(obj);
  return obj;
}

function poolKill(pool, idx, p) {
  p.active = false;
}

function poolCount(pool) {
  let n = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].active) n++;
  return n;
}

function poolClear(pool) {
  for (let i = 0; i < pool.length; i++) pool[i].active = false;
}

// ========== Pre-rendered sprites ==========
// Created once, reused via drawImage. Saves createRadialGradient per frame.

let _glowSprite = null;
function getGlowSprite() {
  if (_glowSprite) return _glowSprite;
  const size = 64;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _glowSprite = cvs;
  return cvs;
}

let _smokeSprite = null;
function getSmokeSprite() {
  if (_smokeSprite) return _smokeSprite;
  const size = 64;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _smokeSprite = cvs;
  return cvs;
}

// ========== orb/lava-orb.js ==========
// LavaOrb class — core class. Liquid + waves + embers + glass + bubbles + cracks + inner drops.
// Effects (fire, frost, detach, explosion, lava drops) are added as mixins via installXxx()
// from orb/*.js and fx/*.js modules.



/**
 * LavaOrb — temperature-reactive liquid sphere.
 * Renders to Canvas 2D context of orbCanvas. Background effects (fire/frost)
 * render to the optional fireCanvas (FIRE_SCALE × size).
 *
 * @param {HTMLCanvasElement} orbCanvas  — main canvas (size × size)
 * @param {HTMLCanvasElement} [fireCanvas] — optional FX canvas (size*scale × size*scale)
 * @param {number} [size=60] — orb size in pixels
 * @param {Object} [options] — local TUNE/FIRE/LIQUID overrides
 */
class LavaOrb {
  constructor(orbCanvas, fireCanvas, size = 60, options = {}) {
    this.canvas = orbCanvas;
    this.ctx = orbCanvas.getContext('2d');
    this.S = size;
    this.R = size / 2;
    orbCanvas.width = orbCanvas.height = this.S;

    // Config — shallow clone defaults + override from options
    this.TUNE = Object.assign(cloneConfig(TUNE_DEFAULTS), options.tune || {});
    this.FIRE = Object.assign(cloneConfig(FIRE_DEFAULTS), options.fire || {});
    this.LIQUID = Object.assign(cloneConfig(LIQUID_DEFAULTS), options.liquid || {});

    // Fire canvas (optional — for fire/frost mixins)
    this.FIRE_SCALE = 6;
    this.fireCanvas = fireCanvas || null;
    this.fireCtx = fireCanvas ? fireCanvas.getContext('2d') : null;
    this.FS = size * this.FIRE_SCALE;
    this.FR = this.FS / 2;
    if (fireCanvas) {
      fireCanvas.width = fireCanvas.height = this.FS;
      fireCanvas.style.width = this.FS + 'px';
      fireCanvas.style.height = this.FS + 'px';
      const offset = (this.FS - this.S) / 2;
      fireCanvas.style.left = -offset + 'px';
      fireCanvas.style.top = -offset + 'px';
    }

    // State
    this.time = Math.random() * 100;
    this.val = 5;
    this.velocity = 0;
    this.tilt = 0;
    this.colors = ['#E05A5A', '#FF7A7A', '#6A1010', '#C03A3A'];

    // Wave simulation — height + velocity columns (Catmull-Rom via _catmullRom)
    this._waveCols = this.LIQUID.cols;
    this._waveH = new Float32Array(this._waveCols);
    this._waveV = new Float32Array(this._waveCols);

    // Movement (set externally — by attach wrapper on slider drag, or by detach physics)
    this._moveVx = 0;
    this._moveVy = 0;
    this._prevFx = 0;
    this._prevFy = 0;
    this._velocityExternallyDriven = false;
    this._detached = false;

    // Internal ember particles (for val >= 4)
    this.particles = [];
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.R + (Math.random() - 0.5) * this.S * 0.5,
        y: this.S * 0.6 + Math.random() * this.S * 0.3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        size: 1 + Math.random() * 2.5,
        life: Math.random()
      });
    }

    // Mouse interaction (for liquid surface pull effect)
    this.mouseX = -1;
    this.mouseY = -1;
    this.mouseNear = false;

    // Placeholder arrays — populated by mixins
    this.fireParticles = [];
    this.fireSparks = [];
    this.fireSmoke = [];
    this.snowflakes = [];
    this.lavaDrops = [];
    this.innerDrops = [];
    this.explosion = [];

    // Glass cracks — state for val 1 (ice) and val 10 (overheated)
    this.cracks = [];
    this.crackIntensity = 0;
  }

  // ==================== PUBLIC API ====================

  setVal(v) {
    this.val = Math.max(1, Math.min(10, v));
  }

  setColors(pal) {
    if (pal && pal.length === 4) this.colors = pal;
  }

  applyForce(dx) {
    this.velocity += dx * 0.4;
    const cols = this._waveCols;
    for (let i = 0; i < cols; i++) {
      const frac = (i / (cols - 1)) - 0.5;
      const smooth = Math.sin(frac * Math.PI) * (frac > 0 ? 1 : -1);
      this._waveV[i] += dx * smooth * 1.5;
    }
    // Clamp
    for (let j = 0; j < cols; j++) {
      this._waveV[j] = Math.max(-15, Math.min(15, this._waveV[j]));
      this._waveH[j] = Math.max(-12, Math.min(12, this._waveH[j]));
    }
  }

  setMouse(mx, my) {
    this.mouseX = mx;
    this.mouseY = my;
    this.mouseNear = (mx * mx + my * my) < (this.S * 3) * (this.S * 3);
  }

  clearMouse() {
    this.mouseX = -1;
    this.mouseY = -1;
    this.mouseNear = false;
  }

  setWorldPos(fx, fy) {
    // Placeholder — detach mixin overrides with full implementation
    this._prevFx = fx;
    this._prevFy = fy;
  }

  resize(size) {
    this.S = size;
    this.R = size / 2;
    this.canvas.width = this.canvas.height = size;
    this.FS = size * this.FIRE_SCALE;
    this.FR = this.FS / 2;
    if (this.fireCanvas) {
      this.fireCanvas.width = this.fireCanvas.height = this.FS;
      this.fireCanvas.style.width = this.FS + 'px';
      this.fireCanvas.style.height = this.FS + 'px';
      const offset = (this.FS - this.S) / 2;
      this.fireCanvas.style.left = -offset + 'px';
      this.fireCanvas.style.top = -offset + 'px';
    }
  }

  explode() {
    for (let i = 0; i < 40; i++) {
      this.explosion.push({
        x: this.R, y: this.R,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        size: 1.5 + Math.random() * 3,
        life: 0.6 + Math.random() * 0.4,
        active: true
      });
    }
    // Inner splash — drop fountain inside, if mixin is installed
    if (this.spawnInnerDrops) this.spawnInnerDrops(8);
  }

  // ==================== PHYSICS UPDATE ====================

  /** Main simulation step (called from Group's animate loop). */
  update(dt = 1.0) {
    this.time += 0.06 * this.TUNE.speed * dt;
    // Global tilt
    this.tilt += this.velocity * dt;
    this.velocity *= Math.pow(0.92, dt);
    this.velocity -= this.tilt * 0.06 * dt;
    if (Math.abs(this.tilt) < 0.01 && Math.abs(this.velocity) < 0.01) {
      this.tilt = 0; this.velocity = 0;
    }

    // Velocity decay (unless externally driven this frame)
    if (!this._velocityExternallyDriven) {
      this._moveVx *= Math.pow(0.92, dt);
      this._moveVy *= Math.pow(0.92, dt);
      if (Math.abs(this._moveVx) < 0.05) this._moveVx = 0;
      if (Math.abs(this._moveVy) < 0.05) this._moveVy = 0;
    }
    this._velocityExternallyDriven = false;

    // Column waves — params from LIQUID config (fallback to sensible defaults)
    const cols = this._waveCols;
    const wh = this._waveH, wv = this._waveV;
    const spread = this.LIQUID.spread || 0.25;
    const damp = Math.pow(this.LIQUID.damping || 0.975, dt);
    const spring = this.LIQUID.spring || 0.05;
    const substeps = Math.max(1, Math.round(this.LIQUID.substeps || 4));

    for (let step = 0; step < substeps; step++) {
      for (let i = 0; i < cols; i++) {
        wv[i] += -spring * wh[i] * dt;
        wv[i] *= damp;
        wh[i] += wv[i] * this.TUNE.speed * 0.25 * dt;
      }
      // Propagate — each pair once (fix for striping)
      for (let i = 0; i < cols - 1; i++) {
        const d = (wh[i] - wh[i + 1]) * spread * dt;
        wv[i] -= d;
        wv[i + 1] += d;
      }
    }
    // Anti-stripe smoothing — 3 passes
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < cols - 1; i++) {
        wh[i] = wh[i] * 0.5 + (wh[i - 1] + wh[i + 1]) * 0.25;
        wv[i] = wv[i] * 0.5 + (wv[i - 1] + wv[i + 1]) * 0.25;
      }
    }

    // Inner drops physics — drop fountain inside orb
    for (let di = this.innerDrops.length - 1; di >= 0; di--) {
      const drop = this.innerDrops[di];
      if (drop.stuck) {
        drop.stuckTimer -= dt;
        if (drop.stuckTimer <= 0) { drop.dripping = true; drop.stuck = false; }
        continue;
      }
      if (drop.dripping) {
        drop.y += 0.8 * dt;
        drop.life -= 0.015 * dt;
        if (drop.life <= 0) this.innerDrops.splice(di, 1);
        continue;
      }
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.vy += 0.12 * dt;
      drop.life -= 0.015 * dt;
      const distFromCenter = Math.sqrt(drop.x * drop.x + drop.y * drop.y);
      if (distFromCenter > this.R * 0.88) {
        drop.stuck = true;
        drop.stuckTimer = 15 + Math.random() * 25;
        drop.stuckX = drop.x;
        drop.stuckY = drop.y;
        drop.vx = 0; drop.vy = 0;
        continue;
      }
      if (drop.life <= 0) this.innerDrops.splice(di, 1);
    }
  }

  // ==================== RENDER ====================

  /** Catmull-Rom interpolation between height columns (smooth liquid surface). */
  _catmullRom(lx, S) {
    const nc = this._waveCols;
    const colFrac = lx / S * (nc - 1);
    const ci = Math.floor(colFrac);
    const t = colFrac - ci;
    const p0 = this._waveH[Math.max(0, ci - 1)];
    const p1 = this._waveH[Math.min(ci, nc - 1)];
    const p2 = this._waveH[Math.min(ci + 1, nc - 1)];
    const p3 = this._waveH[Math.min(ci + 2, nc - 1)];
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((-p0 + 3 * p1 - 3 * p2 + p3) * t3 +
                  (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                  (-p0 + p2) * t + 2 * p1);
  }

  draw(dt = 1.0) {
    // Optional fire effect (mixin) — only if installed and val is not frost
    const tpCheck = tempParams(this.val);
    if (!tpCheck.frost && this.drawFireEffect) {
      this.drawFireEffect(dt);
    } else if (tpCheck.frost && this.drawFrostEffect) {
      this.drawFrostEffect(dt);
    } else if (this.fireCtx) {
      // Neither fire nor frost active — clear fire canvas
      this.fireCtx.clearRect(0, 0, this.FS, this.FS);
    }

    // Lava drops (mixin — installed if installParticles was called)
    if (this.drawLavaDrops) this.drawLavaDrops(dt);

    // Main orb render (always)
    const ctx = this.ctx, S = this.S, R = this.R, t = this.time, tilt = this.tilt;
    const c = this.colors, val = this.val;
    const tp = tempParams(val);
    const isDark = document.body.getAttribute('data-theme') === 'dark';

    ctx.clearRect(0, 0, S, S);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R - 0.5, 0, Math.PI * 2);
    ctx.clip();

    // Background — glass interior
    const bgGrad = ctx.createRadialGradient(R * 0.7, R * 0.4, 0, R, R, R);
    if (tp.frost) {
      bgGrad.addColorStop(0, isDark ? '#1a2a40' : '#2a3a50');
      bgGrad.addColorStop(1, isDark ? '#0a1020' : '#151e28');
    } else if (tp.fire) {
      bgGrad.addColorStop(0, isDark ? '#2a1510' : '#3a2015');
      bgGrad.addColorStop(1, isDark ? '#150808' : '#1a0a0a');
    } else {
      bgGrad.addColorStop(0, isDark ? '#1a1a30' : '#2a2a40');
      bgGrad.addColorStop(1, isDark ? '#08080f' : '#111118');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, S, S);

    // Liquid — fill override (LIQUID.fill > 0 overrides temperature-based fill)
    const effFill = (this.LIQUID.fill > 0) ? this.LIQUID.fill : tp.fill;
    const baseY = S * (1 - effFill);
    const layerCount = Math.max(1, Math.min(5, Math.round(this.LIQUID.layers || 3)));
    const allLayers = [
      { amp: tp.amp,        freq: 0.10, speed: tp.speed * 0.8, color: c[2], alpha: 1.0 },
      { amp: tp.amp * 0.8,  freq: 0.15, speed: tp.speed * 1.2, color: c[0], alpha: 0.7 },
      { amp: tp.amp * 0.6,  freq: 0.22, speed: tp.speed * 1.5, color: c[1], alpha: 0.6 },
      { amp: tp.amp * 0.5,  freq: 0.28, speed: tp.speed * 1.8, color: c[3], alpha: 0.5 },
      { amp: tp.amp * 0.4,  freq: 0.35, speed: tp.speed * 2.2, color: c[0], alpha: 0.4 }
    ];
    const layers = allLayers.slice(0, layerCount);
    for (let li = 0; li < layers.length; li++) {
      const L = layers[li];
      ctx.beginPath();
      for (let lx = 0; lx <= S; lx++) {
        const waveOffset = this._catmullRom(lx, S);
        const waveY = baseY
          + Math.sin(lx * L.freq + t * L.speed) * L.amp
          + Math.sin(lx * L.freq * 1.7 + t * L.speed * 0.6) * L.amp * 0.5
          + (tilt * (lx - R) / R) * (3 + val * 0.5)
          + waveOffset;
        if (lx === 0) ctx.moveTo(lx, waveY);
        else ctx.lineTo(lx, waveY);
      }
      ctx.lineTo(S, S); ctx.lineTo(0, S); ctx.closePath();
      const lGrad = ctx.createLinearGradient(0, baseY, 0, S);
      lGrad.addColorStop(0, L.color);
      lGrad.addColorStop(0.6, c[2]);
      lGrad.addColorStop(1, '#000');
      ctx.fillStyle = lGrad;
      ctx.globalAlpha = L.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Surface glow (val >= 5) — toggled via LIQUID.surfaceGlow
    if (val >= 5 && this.LIQUID.surfaceGlow !== false) {
      const glowI = (val - 4) / 6;
      const sg = ctx.createRadialGradient(R, baseY, 0, R, baseY, R * 0.9);
      sg.addColorStop(0, `rgba(255,220,80,${(0.15 + glowI * 0.4).toFixed(2)})`);
      sg.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, baseY - 10, S, 20);
    }

    // Bubbles — in liquid for val 3+ (proportional to tp.bubble, toggled via LIQUID.bubbles)
    if (this.LIQUID.bubbles !== false && tp.bubble > 0.1) {
      const bc = Math.floor(tp.bubble * 6);
      for (let bi = 0; bi < bc; bi++) {
        const bbx = R + Math.sin(t * 0.8 + bi * 4.3) * R * 0.5;
        const bby = baseY + 5 + ((t * 20 + bi * 17) % (S - baseY));
        ctx.beginPath();
        ctx.arc(bbx, bby, Math.max(0.5, 1 + tp.bubble * 1.5), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fill();
      }
    }

    // Embers inside orb — toggled via LIQUID.embers
    const ae = (this.LIQUID.embers === false) ? 0 : Math.min(tp.embers, this.particles.length);
    for (let ei = 0; ei < ae; ei++) {
      const p = this.particles[ei];
      p.y += p.vy * (0.5 + val * 0.1);
      p.x += (tilt * 0.15 + p.vx);
      p.life -= (0.008 + val * 0.002);
      if (p.life <= 0 || p.y < baseY - 12) {
        p.y = S * (0.6 + tp.fill * 0.3) + Math.random() * S * 0.1;
        p.x = R + (Math.random() - 0.5) * S * 0.5;
        p.life = 0.6 + Math.random() * 0.4;
        p.vy = -0.3 - Math.random() * 0.5;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.size = 1 + Math.random() * (1 + val * 0.2);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2);
      if (val >= 8) {
        ctx.fillStyle = `rgba(255,255,${Math.floor(80 + Math.random() * 80)},${(p.life * 0.7).toFixed(2)})`;
      } else if (val >= 5) {
        ctx.fillStyle = `rgba(255,230,120,${(p.life * 0.5).toFixed(2)})`;
      } else {
        ctx.fillStyle = `rgba(200,230,255,${(p.life * 0.35).toFixed(2)})`;
      }
      ctx.fill();
    }

    // Inner drops (liquid-orb-editor splash system) — drop fountain inside orb
    for (let di = 0; di < this.innerDrops.length; di++) {
      const drop = this.innerDrops[di];
      const dropX = (drop.stuck ? drop.stuckX : drop.x) + R;
      let dropY = (drop.stuck ? drop.stuckY : drop.y) + R;
      if (drop.dripping) { dropY = drop.y + R; }
      ctx.globalAlpha = drop.life * 0.8;
      ctx.fillStyle = drop.color || c[0];
      ctx.beginPath();
      ctx.arc(dropX, dropY, drop.size || 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Inner fire glow — radial glow from inside in fire state (val 9+)
    if (tp.fire) {
      ctx.globalCompositeOperation = 'lighter';
      const ig = ctx.createRadialGradient(R, baseY, 0, R, R * 0.3, R);
      ig.addColorStop(0, val >= 10 ? 'rgba(255,150,30,0.6)' : 'rgba(255,120,20,0.35)');
      ig.addColorStop(0.5, 'rgba(255,80,10,0.2)');
      ig.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = ig;
      ctx.fillRect(0, 0, S, S);
      // Hot core above liquid surface
      const whGrad = ctx.createRadialGradient(R, baseY, 0, R, baseY, R * 0.4);
      whGrad.addColorStop(0, val >= 10 ? 'rgba(255,255,220,0.5)' : 'rgba(255,255,200,0.25)');
      whGrad.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = whGrad;
      ctx.fillRect(0, baseY - R * 0.4, S, R * 0.8);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    // Electric arcs — lightning inside orb at val 4-7 (neutral state)
    if (val >= 4 && val <= 7 && !tp.frost && !tp.fire) {
      const arcCount = val <= 5 ? 2 : 3;
      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = val <= 5 ? 'rgba(100,180,255,0.6)' : 'rgba(180,220,255,0.7)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(100,180,255,0.8)';
      ctx.shadowBlur = 4;
      for (let ai = 0; ai < arcCount; ai++) {
        const aStart = (t * 0.7 + ai * 2.1) % (Math.PI * 2);
        const aEnd = aStart + 0.8 + Math.random() * 1.5;
        ctx.beginPath();
        const ax = R + Math.cos(aStart) * R * 0.3;
        const ay = R + Math.sin(aStart) * R * 0.3;
        ctx.moveTo(ax, ay);
        const segments = 4 + Math.floor(Math.random() * 3);
        for (let seg = 1; seg <= segments; seg++) {
          const arcFrac = seg / segments;
          const tx = R + Math.cos(aEnd) * R * 0.7;
          const ty = R + Math.sin(aEnd) * R * 0.5;
          const lx2 = ax + (tx - ax) * arcFrac + (Math.random() - 0.5) * R * 0.4;
          const ly2 = ay + (ty - ay) * arcFrac + (Math.random() - 0.5) * R * 0.4;
          ctx.lineTo(lx2, ly2);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Glass cracks — at val 1 (ice) and val 10 (overheated). LIQUID.cracks controls count.
    const crackCount = Math.floor(this.LIQUID.cracks || 0);
    if ((val <= 1 || val >= 10) && crackCount > 0) {
      const targetCrack = val <= 1 ? 0.7 : 1.0;
      this.crackIntensity += (targetCrack - this.crackIntensity) * 0.02 * dt;
      // Generate cracks if missing or count changed
      if (this.cracks.length !== crackCount) {
        this.cracks = [];
        for (let cr = 0; cr < crackCount; cr++) {
          const cAngle = (cr / crackCount) * Math.PI * 2 + Math.random() * 0.5;
          const segs = [];
          let cx2 = R, cy2 = R;
          for (let cs = 0; cs < 4; cs++) {
            const nr = (cs + 1) / 4 * R * 0.9;
            cx2 = R + Math.cos(cAngle + (Math.random() - 0.5) * 0.4) * nr;
            cy2 = R + Math.sin(cAngle + (Math.random() - 0.5) * 0.4) * nr;
            segs.push({ x: cx2, y: cy2 });
          }
          this.cracks.push(segs);
        }
      }
      if (this.crackIntensity > 0.1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(R, R, R - 1, 0, Math.PI * 2);
        ctx.clip();
        const crColor = val <= 1 ? 'rgba(180,220,255,' : 'rgba(255,180,80,';
        ctx.lineWidth = 1;
        for (let cri = 0; cri < this.cracks.length; cri++) {
          const segs2 = this.cracks[cri];
          ctx.beginPath();
          ctx.moveTo(R, R);
          for (let csi = 0; csi < segs2.length; csi++) {
            ctx.lineTo(segs2[csi].x, segs2[csi].y);
          }
          ctx.strokeStyle = crColor + (this.crackIntensity * (0.3 + Math.random() * 0.2)).toFixed(2) + ')';
          ctx.stroke();
          // Branch off segs2[1]
          if (segs2.length >= 2) {
            const brPt = segs2[1];
            ctx.beginPath();
            ctx.moveTo(brPt.x, brPt.y);
            ctx.lineTo(brPt.x + (Math.random() - 0.5) * R * 0.4, brPt.y + (Math.random() - 0.5) * R * 0.4);
            ctx.strokeStyle = crColor + (this.crackIntensity * 0.2).toFixed(2) + ')';
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    } else {
      this.crackIntensity *= Math.pow(0.95, dt);
    }

    // Glass highlight + rim — toggled via LIQUID.glass
    if (this.LIQUID.glass !== false) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - 0.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.ellipse(R * 0.72, R * 0.35, R * 0.38, R * 0.22, -0.2, 0, Math.PI * 2);
      const hlG = ctx.createRadialGradient(R * 0.72, R * 0.35, 0, R * 0.72, R * 0.35, R * 0.4);
      hlG.addColorStop(0, tp.frost ? 'rgba(200,230,255,0.4)' : (tp.fire ? 'rgba(255,240,200,0.2)' : 'rgba(255,255,255,0.3)'));
      hlG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hlG;
      ctx.fill();
      ctx.restore();
    }

    // Glass rim
    if (this.LIQUID.glass !== false) {
    ctx.beginPath();
    ctx.arc(R, R, R - 1, 0, Math.PI * 2);
    if (tp.fire) {
      ctx.strokeStyle = val >= 10 ? 'rgba(255,150,50,0.7)' : 'rgba(255,120,40,0.4)';
      ctx.lineWidth = val >= 10 ? 2.5 : 2;
    } else {
      ctx.strokeStyle = tp.frost ? (c[1] + '60') : (c[3] + '80');
      ctx.lineWidth = tp.frost ? 2 : 1.5;
    }
    ctx.stroke();
    }  // end if LIQUID.glass
  }
}

// ========== orb/fire-doom.js ==========
// DOOM fire — cellular automaton (retro pixel fire).
// Install: installFireDoom(LavaOrb) adds methods to prototype.
// Activated via FIRE_CFG.style = 'doom'.



function installFireDoom(LavaOrb) {
  /**
   * Initialize DOOM buffers. Called from LavaOrb constructor
   * via _initDoomBuffers() (see modification in lava-orb.js).
   */
  LavaOrb.prototype._initDoomBuffers = function() {
    this.doomFireRes = this.FIRE.doomRes || 2;
    this.doomFireW = Math.ceil(this.FS / this.doomFireRes);
    this.doomFireH = Math.ceil(this.FS / this.doomFireRes);
    this.doomFireBuf = new Uint8Array(this.doomFireW * this.doomFireH);
    this._doomBufCvs = null;
    this._doomBufCtx = null;
    this._doomBufImg = null;
  };

  /**
   * Update DOOM fire buffer — cellular automaton with heat-source offset on movement.
   */
  LavaOrb.prototype.updateDoomFireBuffer = function() {
    if (!this.doomFireBuf) this._initDoomBuffers();
    const tp = tempParams(this.val);
    const buf = this.doomFireBuf, w = this.doomFireW, h = this.doomFireH;
    const val = this.val;
    const orbR = this.R, res = this.doomFireRes;

    if (!tp.fire) {
      // Cool down rapidly when not in fire state
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] > 0) buf[i] = Math.max(0, buf[i] - 3);
      }
      return;
    }

    const maxIdx = FIRE_PALETTE.length - 1;
    const intensity = (val >= 10 ? 1.0 : 0.65) * this.FIRE.doomIntensity;

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const orbCells = Math.ceil(orbR / res);

    // Heat source offset — shifts opposite to movement (natural trail)
    const speed = Math.sqrt(this._moveVx * this._moveVx + this._moveVy * this._moveVy);
    const trailP = this.FIRE.doomTrailPower;
    const maxOffset = orbCells * trailP;
    const offsetX = Math.round(Math.max(-maxOffset, Math.min(maxOffset, -this._moveVx / res * trailP * 0.45)));
    const offsetY = Math.round(Math.max(-maxOffset, Math.min(maxOffset, -this._moveVy / res * trailP * 0.45)));
    const hcx = cx + offsetX;
    const hcy = cy + offsetY;

    // Seed heat around offset center
    for (let sx = hcx - orbCells - 2; sx <= hcx + orbCells + 2; sx++) {
      if (sx < 0 || sx >= w) continue;
      for (let sy = hcy - orbCells - 1; sy <= hcy + orbCells + 1; sy++) {
        if (sy < 0 || sy >= h) continue;
        const dx = sx - hcx, dy = sy - hcy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > orbCells + 2) continue;
        const baseHeat = dist < orbCells ? maxIdx : Math.floor(maxIdx * (1 - (dist - orbCells) / 3));
        const heat = Math.floor(baseHeat * intensity);
        buf[sy * w + sx] = Math.max(buf[sy * w + sx], Math.min(maxIdx, heat));
      }
    }

    // Seed at original center too (when moving fast)
    if (speed > 2) {
      for (let sx2 = cx - orbCells; sx2 <= cx + orbCells; sx2++) {
        if (sx2 < 0 || sx2 >= w) continue;
        for (let sy2 = cy; sy2 <= cy + orbCells; sy2++) {
          if (sy2 < 0 || sy2 >= h) continue;
          const dx2 = sx2 - cx, dy2 = sy2 - cy;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 > orbCells) continue;
          const heat2 = Math.floor(maxIdx * 0.4 * intensity);
          buf[sy2 * w + sx2] = Math.max(buf[sy2 * w + sx2], Math.min(maxIdx, heat2));
        }
      }
    }

    // Random sparks biased toward trailing side
    for (let sp = 0; sp < (val >= 10 ? 15 : 6); sp++) {
      let sa = Math.random() * Math.PI * 2;
      if (speed > 2) {
        const trailAngle = Math.atan2(-this._moveVy, -this._moveVx);
        sa = trailAngle + (Math.random() - 0.5) * Math.PI * 1.2;
      }
      const sr = orbCells * (0.5 + Math.random() * 0.8);
      const spx = Math.floor(hcx + Math.cos(sa) * sr);
      const spy = Math.floor(hcy + Math.sin(sa) * sr);
      if (spx >= 0 && spx < w && spy >= 0 && spy < h) {
        buf[spy * w + spx] = Math.min(maxIdx, Math.floor(maxIdx * (0.5 + Math.random() * 0.5) * intensity));
      }
    }

    // Propagate fire UPWARD (DOOM algorithm)
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (y + 1) * w + x;
        const srcVal = buf[srcIdx];
        if (srcVal === 0) { buf[y * w + x] = 0; continue; }
        const decay = Math.floor(Math.random() * 3);
        const wind = Math.floor(Math.random() * 3) - 1;
        const dstX = Math.min(w - 1, Math.max(0, x + wind));
        const newVal = Math.max(0, srcVal - decay);
        buf[y * w + dstX] = newVal;
      }
    }
  };

  /**
   * Render DOOM buffer into fireCtx. No clearRect (caller handles fade).
   */
  LavaOrb.prototype.renderDoomFire = function() {
    if (!this.fireCtx) return;
    const ctx = this.fireCtx;
    const FS = this.FS;
    const buf = this.doomFireBuf, w = this.doomFireW, h = this.doomFireH;
    const orbR = this.R, res = this.doomFireRes;

    if (!this._doomBufCvs || this._doomBufCvs.width !== w) {
      this._doomBufCvs = document.createElement('canvas');
      this._doomBufCvs.width = w;
      this._doomBufCvs.height = h;
      this._doomBufCtx = this._doomBufCvs.getContext('2d');
      this._doomBufImg = this._doomBufCtx.createImageData(w, h);
    }
    const imgData = this._doomBufImg;
    const pixels = imgData.data;
    pixels.fill(0);

    const halfW = w / 2, halfH = h / 2;
    const fadeStart = orbR / res * 1.2;
    const fadeEnd = halfW * 0.95;
    const fadeEndSq = fadeEnd * fadeEnd;
    const fadeStartSq = fadeStart * fadeStart;
    const palMax = FIRE_PALETTE.length - 1;

    for (let fy = 0; fy < h; fy++) {
      for (let fx = 0; fx < w; fx++) {
        const palIdx = buf[fy * w + fx];
        if (palIdx <= 0) continue;
        const rgb = FIRE_PALETTE[Math.min(palIdx, palMax)];
        const dx = fx - halfW, dy = fy - halfH;
        const distSq = dx * dx + dy * dy;
        if (distSq > fadeEndSq) continue;
        const edgeFade = distSq <= fadeStartSq ? 1 : 1 - (distSq - fadeStartSq) / (fadeEndSq - fadeStartSq);
        const brightAlpha = Math.min(0.70, palIdx / palMax);
        const alpha = Math.floor(edgeFade * brightAlpha * 255);
        if (alpha <= 0) continue;
        const idx = (fy * w + fx) * 4;
        pixels[idx] = rgb[0];
        pixels[idx + 1] = rgb[1];
        pixels[idx + 2] = rgb[2];
        pixels[idx + 3] = alpha;
      }
    }
    this._doomBufCtx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this._doomBufCvs, 0, 0, FS, FS);
  };
}

// ========== orb/fire-particles.js ==========
// Fire particles — spawn-based fire (ver3 approach).
// Install: installFireParticles(LavaOrb) adds methods to prototype.
// Activated when FIRE.style === 'particles'.



function installFireParticles(LavaOrb) {
  /**
   * Spawn count fire particles. Val 10 — boosted (size/life/speed).
   */
  LavaOrb.prototype.spawnFireParticles = function(count) {
    const FR = this.FR, R = this.R;
    const speed = Math.sqrt(this._moveVx * this._moveVx + this._moveVy * this._moveVy);
    const trailAngle = Math.atan2(-this._moveVy, -this._moveVx);
    const trailBlend = Math.min(1, speed / 8);
    const flameDir = blendAngle(-Math.PI / 2, trailAngle, trailBlend);
    const arcRad = this.FIRE.spawnArc / 180 * Math.PI;
    const arcCenter = flameDir + Math.PI;

    // Smooth scaling by fireIntensity (0-1) — instead of binary val>=10 boost.
    // val 7 = 0.25, val 8 = 0.5, val 9 = 0.75, val 10 = 1.0 → smooth gradient.
    const tp = tempParams(this.val);
    const intensity = tp.fireIntensity || 0;
    const sizeMul = 0.65 + intensity * 0.45;   // 0.65 (weak) → 1.1 (max)
    const lifeMul = 0.70 + intensity * 0.40;   // 0.70 → 1.1
    const speedMul = 0.80 + intensity * 0.25;  // 0.80 → 1.05

    for (let i = 0; i < count; i++) {
      const spawnAngle = arcCenter + (Math.random() - 0.5) * arcRad;
      const spawnR = R * this.FIRE.spawnOffset;
      const px = FR + Math.cos(spawnAngle) * spawnR;
      const py = FR + Math.sin(spawnAngle) * spawnR;

      const outDx = Math.cos(spawnAngle), outDy = Math.sin(spawnAngle);
      const flameDx = Math.cos(flameDir), flameDy = Math.sin(flameDir);
      const restW = 1 - trailBlend;
      let combDx = (outDx * 0.4 + flameDx * 0.6) * restW + flameDx * trailBlend;
      let combDy = (outDy * 0.4 + flameDy * 0.6) * restW + flameDy * trailBlend;
      const combLen = Math.sqrt(combDx * combDx + combDy * combDy) || 1;
      combDx /= combLen; combDy /= combLen;
      const sp = (Math.random() - 0.5) * (this.FIRE.flameWidth * 0.3 - trailBlend * 0.15);
      const cosS = Math.cos(sp), sinS = Math.sin(sp);
      const finalDx = combDx * cosS - combDy * sinS;
      const finalDy = combDx * sinS + combDy * cosS;
      const mainSpeed = (1.0 + Math.random() * 2.0) * this.FIRE.flameHeight * speedMul;

      poolAlloc(this.fireParticles, {
        x: px, y: py,
        vx: finalDx * mainSpeed, vy: finalDy * mainSpeed,
        fax: flameDx, fay: flameDy,
        life: 0,
        maxLife: (this.FIRE.baseLife + Math.random() * this.FIRE.baseLife * 0.4) * lifeMul,
        size: this.FIRE.baseSize * (0.4 + Math.random() * 0.7) * sizeMul
      });
    }
  };

  /**
   * Spawn sparks.
   */
  LavaOrb.prototype.spawnFireSparks = function(count) {
    const FR = this.FR, R = this.R;
    const speed = Math.sqrt(this._moveVx * this._moveVx + this._moveVy * this._moveVy);
    const ta = Math.atan2(-this._moveVy, -this._moveVx);
    const blend = Math.min(1, speed / 6);
    const fd = blendAngle(-Math.PI / 2, ta, blend);

    for (let i = 0; i < count; i++) {
      const angle = fd + (Math.random() - 0.5) * Math.PI * 0.6;
      const px = FR + Math.cos(angle) * R * 0.7;
      const py = FR + Math.sin(angle) * R * 0.7;
      const speed2 = 2 + Math.random() * 3;
      poolAlloc(this.fireSparks, {
        x: px, y: py,
        vx: Math.cos(angle) * speed2,
        vy: Math.sin(angle) * speed2,
        life: 8 + Math.random() * 6,
        size: 1 + Math.random() * 1.5
      });
    }
  };

  /**
   * Main method — called from draw(). Handles fire-particles path OR DOOM path.
   */
  LavaOrb.prototype.drawFireEffect = function(dt) {
    if (!this.fireCtx) return;
    const tp = tempParams(this.val);
    const isDoom = this.FIRE.style === 'doom';
    const fCtx = this.fireCtx;
    const FS = this.FS, FR = this.FR, R = this.R;
    const fdt = dt * this.FIRE.fireSpeed;

    // Transition fire → non-fire: aggressively kill live particles to avoid "stuck" fire
    if (!tp.fire && this._wasInFire) {
      for (let i = 0; i < this.fireParticles.length; i++) {
        if (this.fireParticles[i].active) {
          // Accelerate death — set life close to maxLife so they die in 2-3 frames
          this.fireParticles[i].life = this.fireParticles[i].maxLife * 0.9;
        }
      }
      for (let i = 0; i < this.fireSparks.length; i++) {
        if (this.fireSparks[i].active) this.fireSparks[i].life = Math.min(this.fireSparks[i].life, 2);
      }
    }
    this._wasInFire = tp.fire;

    // 1. Fade canvas (destination-out) — trail for particles. When !tp.fire — amplified fade.
    const fadeMul = tp.fire ? 1.0 : 3.0;
    const fadeCorrected = 1 - Math.pow(1 - this.FIRE.fadeAlpha * fadeMul, dt);
    fCtx.globalCompositeOperation = 'destination-out';
    fCtx.fillStyle = 'rgba(0,0,0,' + fadeCorrected.toFixed(4) + ')';
    fCtx.fillRect(0, 0, FS, FS);
    fCtx.globalCompositeOperation = 'source-over';

    // 2. DOOM rendering (if style='doom' and fire active) — on top of fade
    if (isDoom && tp.fire && this.updateDoomFireBuffer) {
      this.updateDoomFireBuffer();
      this.renderDoomFire();
    } else if (isDoom && this.updateDoomFireBuffer) {
      this.updateDoomFireBuffer();  // cooling
    }

    // 3. Spawn fire particles (only if not DOOM, rate proportional to fireIntensity)
    const speed = Math.sqrt(this._moveVx * this._moveVx + this._moveVy * this._moveVy);
    if (!isDoom && tp.fire && this.FIRE.fire) {
      const fireCount = poolCount(this.fireParticles);
      const maxP = this.FIRE.maxParticles;
      if (fireCount < maxP) {
        // Smooth spawn: rate ∝ fireIntensity. val 7 = 0.25x → just 2 particles, val 10 = 1.0x → 8+
        const intensity = tp.fireIntensity || 0;
        const rate = Math.max(1, (3 + speed * 1.5) * intensity * 1.8);
        this.spawnFireParticles(Math.min(Math.floor(rate), maxP - fireCount));
      }
    }

    // 4. Spawn sparks (works in both modes)
    if (tp.fire && this.FIRE.sparks && this.FIRE.sparkRate > 0 &&
        Math.random() < this.FIRE.sparkRate / 100 + speed * 0.02) {
      this.spawnFireSparks(1 + Math.floor(speed * 0.2));
    }

    // 5. Render fire particles (not in DOOM)
    fCtx.globalCompositeOperation = 'lighter';
    if (!isDoom) {
      for (let i = this.fireParticles.length - 1; i >= 0; i--) {
        const p = this.fireParticles[i];
        if (!p.active) continue;
        p.x += p.vx * fdt;
        p.y += p.vy * fdt;
        p.vy -= this.FIRE.buoyancy * fdt;
        p.vx += (Math.random() - 0.5) * this.FIRE.turbulence * fdt;
        p.vy += (Math.random() - 0.5) * this.FIRE.turbulence * 0.3 * fdt;

        p.life += fdt;
        if (p.life >= p.maxLife) { poolKill(this.fireParticles, i, p); continue; }

        const t = p.life / p.maxLife;
        const inv = 1 - t;
        const sz = p.size * (0.3 + inv * 0.7);
        if (sz < 0.5) { poolKill(this.fireParticles, i, p); continue; }

        // Edge fade
        const edx = p.x - FR, edy = p.y - FR;
        const edist = Math.sqrt(edx * edx + edy * edy);
        const edgeMax = FR * 0.85;
        const edgeFade = edist < edgeMax ? 1 : Math.max(0, 1 - (edist - edgeMax) / (FR * 0.15));
        if (edgeFade <= 0) { poolKill(this.fireParticles, i, p); continue; }

        const alpha = inv * inv * 0.5 * edgeFade;
        const r = Math.min(255, 260 - t * 180);
        const g = Math.min(255, 180 * inv * inv);
        const b = Math.min(255, 80 * inv * inv * inv);

        // Small particles — flat circle (faster). Large — radialGradient (soft edges).
        if (sz < 3) {
          fCtx.globalAlpha = alpha;
          fCtx.fillStyle = 'rgb(' + ~~r + ',' + ~~g + ',' + ~~b + ')';
          fCtx.beginPath();
          fCtx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          fCtx.fill();
        } else {
          const grad = fCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz);
          grad.addColorStop(0, 'rgba(' + ~~r + ',' + ~~g + ',' + ~~b + ',' + alpha.toFixed(3) + ')');
          grad.addColorStop(0.4, 'rgba(' + ~~(r * 0.8) + ',' + ~~(g * 0.6) + ',0,' + (alpha * 0.6).toFixed(3) + ')');
          grad.addColorStop(1, 'rgba(' + ~~(r * 0.4) + ',0,0,0)');
          fCtx.globalAlpha = 1;
          fCtx.fillStyle = grad;
          fCtx.beginPath();
          fCtx.arc(p.x, p.y, sz, 0, Math.PI * 2);
          fCtx.fill();
        }
      }
    }

    // 6. Render sparks (both modes)
    fCtx.globalCompositeOperation = 'lighter';
    for (let si = this.fireSparks.length - 1; si >= 0; si--) {
      const s = this.fireSparks[si];
      if (!s.active) continue;
      s.x += s.vx * fdt;
      s.y += s.vy * fdt;
      s.vy -= 0.05 * fdt;
      s.vx *= 0.98;
      s.life -= fdt;
      if (s.life <= 0) { poolKill(this.fireSparks, si, s); continue; }
      const sdx = s.x - FR, sdy = s.y - FR;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const sEdge = FR * 0.9;
      const sFade = sDist < sEdge ? 1 : Math.max(0, 1 - (sDist - sEdge) / (FR * 0.1));
      if (sFade <= 0) { poolKill(this.fireSparks, si, s); continue; }
      const sa = Math.min(1, s.life / 10) * sFade;
      fCtx.globalAlpha = 1;
      fCtx.fillStyle = 'rgba(255,220,100,' + sa.toFixed(2) + ')';
      fCtx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }

    // 7. Glow envelope (only in particle mode)
    if (!isDoom && this.FIRE.glowIntensity > 0) {
      const gi = this.FIRE.glowIntensity / 15;
      const glowR = R * (1 + this.FIRE.glowSize * 0.6);
      const ag = fCtx.createRadialGradient(FR, FR, R * 0.5, FR, FR, glowR);
      ag.addColorStop(0, 'rgba(255,120,30,' + (0.25 * gi).toFixed(3) + ')');
      ag.addColorStop(0.3, 'rgba(255,80,10,' + (0.12 * gi).toFixed(3) + ')');
      ag.addColorStop(0.6, 'rgba(200,40,0,' + (0.05 * gi).toFixed(3) + ')');
      ag.addColorStop(1, 'rgba(100,10,0,0)');
      fCtx.fillStyle = ag;
      fCtx.beginPath(); fCtx.arc(FR, FR, glowR, 0, Math.PI * 2); fCtx.fill();
    }

    fCtx.globalCompositeOperation = 'source-over';
    fCtx.globalAlpha = 1;
  };
}

// ========== orb/frost.js ==========
// Frost — snowflakes around orb at val <= 2.
// Install: installFrost(LavaOrb) adds methods + snowflake init.


function installFrost(LavaOrb) {
  /**
   * Initialize snowflakes. Called automatically on first drawFrostEffect.
   */
  LavaOrb.prototype._initSnowflakes = function() {
    this.snowflakes = [];
    for (let i = 0; i < 60; i++) {
      this.snowflakes.push({
        x: Math.random() * this.FS,
        y: Math.random() * this.FS,
        r: 0.5 + Math.random() * 2.5,
        d: Math.random() * 60,
        opacity: 0.3 + Math.random() * 0.7
      });
    }
    // Ice trail pool — particles trailing behind moving cold orb
    if (!this.iceTrail) this.iceTrail = [];
    for (let i = 0; i < 30; i++) {
      this.iceTrail.push({ x: 0, y: 0, vx: 0, vy: 0, size: 0, life: 0, active: false });
    }
    this._iceTrailTimer = 0;
  };

  /**
   * Render snowflakes around orb (in fireCanvas). Active at val <= 2.
   */
  LavaOrb.prototype.drawFrostEffect = function(dt) {
    if (!this.fireCtx) return;
    const tp = tempParams(this.val);
    if (!tp.frost) { this._wasInFrost = false; return; }

    if (!this.snowflakes || this.snowflakes.length === 0) this._initSnowflakes();

    // On entering frost (!frost → frost transition) — reset snowflakes above canvas
    // so they start falling from the top, not appear randomly on the sides.
    if (!this._wasInFrost) {
      const snowR = this.R * (1.5 + this.TUNE.fxRadius * 2.5);
      for (const s of this.snowflakes) {
        // Y — above snow-zone top (to fall down)
        s.y = this.FR - snowR - Math.random() * snowR * 0.5;
        s.x = this.FR + (Math.random() - 0.5) * snowR * 2;
      }
    }
    this._wasInFrost = true;

    const ctx = this.fireCtx;
    const FS = this.FS, FR = this.FR, val = this.val;
    const orbR = this.R;

    // Full clear — transparent (no destination-out fade, which left ghost artifacts)
    ctx.clearRect(0, 0, FS, FS);

    // Snow zone — radius around orb
    const snowR = orbR * (1.5 + this.TUNE.fxRadius * 2.5);
    const snowCx = FR, snowCy = FR;
    const activeSnow = Math.min(this.snowflakes.length, this.TUNE.particles);

    const snowDriftX = this._moveVx * 0.5;
    const snowDriftY = this._moveVy * 0.5;
    const t = this.time;

    for (let si = 0; si < activeSnow; si++) {
      const s = this.snowflakes[si];
      s.y += (0.3 + s.r * 0.15) * this.TUNE.speed * dt - snowDriftY;
      s.x += Math.sin(t * 0.5 + s.d) * 0.4 * this.TUNE.speed * dt - snowDriftX;
      s.d += 0.01 * this.TUNE.speed * dt;

      // Respawn at snow zone boundary
      if (s.y > snowCy + snowR || s.x < snowCx - snowR || s.x > snowCx + snowR || s.y < snowCy - snowR) {
        const snowSpeed = Math.sqrt(snowDriftX * snowDriftX + snowDriftY * snowDriftY);
        if (snowSpeed > 1) {
          s.x = snowCx + snowDriftX * snowR * 0.3 + (Math.random() - 0.5) * snowR;
          s.y = snowCy + snowDriftY * snowR * 0.3 + (Math.random() - 0.5) * snowR;
        } else {
          s.y = snowCy - snowR + Math.random() * 5;
          s.x = snowCx + (Math.random() - 0.5) * snowR * 2;
        }
      }

      const sdx = s.x - snowCx, sdy = s.y - snowCy;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const snowFade = Math.max(0, Math.min(1, 1 - Math.max(0, (sDist - snowR * 0.6) / (snowR * 0.4))));
      if (snowFade <= 0) continue;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      const opacity = s.opacity * snowFade * (val <= 1 ? 0.9 : 0.5);
      ctx.fillStyle = 'rgba(220,235,255,' + opacity.toFixed(2) + ')';
      ctx.fill();

      // Sparkle on larger snowflakes
      if (s.r > 1.8) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (s.opacity * snowFade * 0.6).toFixed(2) + ')';
        ctx.fill();
      }
    }

    // === Ice trail — frost particles trailing behind moving orb ===
    const iceSpeed = Math.sqrt(this._moveVx * this._moveVx + this._moveVy * this._moveVy);
    if (iceSpeed > 1.5 && this.iceTrail) {
      this._iceTrailTimer = (this._iceTrailTimer || 0) + this.TUNE.speed * dt;
      if (this._iceTrailTimer >= 2) {
        this._iceTrailTimer = 0;
        for (let i = 0; i < this.iceTrail.length; i++) {
          if (!this.iceTrail[i].active) {
            const itp = this.iceTrail[i];
            itp.x = FR + (Math.random() - 0.5) * orbR;
            itp.y = FR + (Math.random() - 0.5) * orbR;
            itp.vx = -this._moveVx * (0.3 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.8;
            itp.vy = -this._moveVy * (0.3 + Math.random() * 0.3) + (Math.random() - 0.5) * 0.8;
            itp.size = 1 + Math.random() * 2.5;
            itp.life = 0.6 + Math.random() * 0.4;
            itp.active = true;
            break;
          }
        }
      }
    }
    // Update + render active ice-trail particles
    if (this.iceTrail) {
      for (let itd = 0; itd < this.iceTrail.length; itd++) {
        const icp = this.iceTrail[itd];
        if (!icp.active) continue;
        icp.x += icp.vx * this.TUNE.speed * dt;
        icp.y += icp.vy * this.TUNE.speed * dt;
        icp.vx *= Math.pow(0.98, dt);
        icp.vy *= Math.pow(0.98, dt);
        icp.life -= 0.015 * this.TUNE.speed * dt;
        if (icp.life <= 0) { icp.active = false; continue; }
        // Edge fade
        const itDx = icp.x - FR, itDy = icp.y - FR;
        const itDist = Math.sqrt(itDx * itDx + itDy * itDy);
        const itEdge = FR * 0.85;
        const itFade = itDist < itEdge ? 1 : Math.max(0, 1 - (itDist - itEdge) / (FR * 0.15));
        if (itFade <= 0) { icp.active = false; continue; }
        const itAlpha = icp.life * itFade;
        ctx.beginPath();
        ctx.arc(icp.x, icp.y, icp.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,225,255,' + (itAlpha * 0.7).toFixed(3) + ')';
        ctx.fill();
        // Sparkle
        ctx.beginPath();
        ctx.arc(icp.x, icp.y, icp.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (itAlpha * 0.5).toFixed(3) + ')';
        ctx.fill();
      }
    }

    // Cold glow — compact, anchored on R (not FR), doesn't blow up across whole fire-canvas
    if (tp.frost) {
      ctx.globalCompositeOperation = 'lighter';
      const glowR = orbR * (val <= 1 ? 2.5 : 2.0);  // was FR*fxRadius (too big)
      const glowI = this.TUNE.intensity;
      const coldGlow = ctx.createRadialGradient(FR, FR, orbR * 0.5, FR, FR, glowR);
      coldGlow.addColorStop(0, 'rgba(80,150,255,' + (0.12 * glowI).toFixed(2) + ')');
      coldGlow.addColorStop(0.6, 'rgba(40,100,255,' + (0.04 * glowI).toFixed(2) + ')');
      coldGlow.addColorStop(1, 'rgba(20,60,180,0)');
      ctx.fillStyle = coldGlow;
      ctx.beginPath();
      ctx.arc(FR, FR, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}

// ========== orb/particles.js ==========
// Particles mixin — lava drops (dripping from orb) + inner splash (fountain inside).
// Install: installParticles(LavaOrb).
// Adds: updateLavaDrops, drawLavaDrops, spawnInnerDrops, drawInnerDrops.


function installParticles(LavaOrb) {

  // ==================== LAVA DROPS ====================
  // Lava drops drip down from orb under gravity. Active at val >= 6.

  LavaOrb.prototype._initLavaDrops = function() {
    if (this.lavaDrops.length > 0) return;  // already initialized
    for (let i = 0; i < 15; i++) {
      this.lavaDrops.push({
        x: 0, y: 0, vx: 0, vy: 0,
        size: 0, life: 0, active: false, trail: null
      });
    }
    this._dropTimer = 0;
  };

  LavaOrb.prototype.updateLavaDrops = function(dt) {
    this._initLavaDrops();
    const tp = tempParams(this.val);
    const val = this.val;

    if (val < 6) {
      // Fade out existing drops
      for (const d of this.lavaDrops) {
        if (d.active) { d.life -= 0.03 * dt; if (d.life <= 0) d.active = false; }
      }
      return;
    }

    const FR = this.FR, orbR = this.R;
    this._dropTimer += dt;

    // Spawn rate depends on temperature
    const spawnInterval = val >= 10 ? 8 : val >= 9 ? 12 : val >= 8 ? 20 : 35;
    if (this._dropTimer >= spawnInterval) {
      this._dropTimer = 0;
      for (const d of this.lavaDrops) {
        if (!d.active) {
          const angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;  // bottom arc
          d.x = FR + Math.cos(angle) * orbR * 0.8;
          d.y = FR + Math.sin(angle) * orbR * 0.8;
          d.vx = (Math.random() - 0.5) * 1.2 - this._moveVx * 0.3;
          d.vy = 0.5 + Math.random() * 1.0 - this._moveVy * 0.3;
          d.size = 1.5 + Math.random() * 2.5 + (val - 6) * 0.3;
          d.life = 1.0;
          d.active = true;
          d.trail = [];
          break;
        }
      }
    }

    for (const drop of this.lavaDrops) {
      if (!drop.active) continue;
      if (!drop.trail) drop.trail = [];
      drop.trail.push({ x: drop.x, y: drop.y, life: 0.5 });
      if (drop.trail.length > 8) drop.trail.shift();

      drop.vy += this.TUNE.gravity * dt;
      drop.vx *= Math.pow(0.99, dt);
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.life -= 0.012 * dt;

      if (drop.y > this.FS || drop.life <= 0) drop.active = false;

      for (let ti = drop.trail.length - 1; ti >= 0; ti--) {
        drop.trail[ti].life -= 0.06 * dt;
        if (drop.trail[ti].life <= 0) drop.trail.splice(ti, 1);
      }
    }
  };

  LavaOrb.prototype.drawLavaDrops = function(dt) {
    if (!this.fireCtx) return;
    this.updateLavaDrops(dt);
    const ctx = this.fireCtx;
    const FR = this.FR;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const d of this.lavaDrops) {
      if (!d.active) continue;

      // Edge fade
      const ldx = d.x - FR, ldy = d.y - FR;
      const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
      const ledge = FR * 0.9;
      const lfade = ldist < ledge ? 1 : Math.max(0, 1 - (ldist - ledge) / (FR * 0.1));

      // Trail
      if (d.trail) {
        for (const tp2 of d.trail) {
          const trailAlpha = tp2.life * d.life * 0.4;
          const trailSize = d.size * tp2.life * 0.6;
          ctx.beginPath();
          ctx.arc(tp2.x, tp2.y, Math.max(0.5, trailSize), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,100,20,' + trailAlpha.toFixed(2) + ')';
          ctx.fill();
        }
      }

      const dropAlpha = d.life * 0.9 * lfade;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      const dg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.size);
      dg.addColorStop(0, 'rgba(255,220,100,' + dropAlpha.toFixed(2) + ')');
      dg.addColorStop(0.4, 'rgba(255,120,20,' + (dropAlpha * 0.8).toFixed(2) + ')');
      dg.addColorStop(1, 'rgba(200,40,0,' + (dropAlpha * 0.3).toFixed(2) + ')');
      ctx.fillStyle = dg;
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,80,10,' + (d.life * 0.15).toFixed(2) + ')';
      ctx.fill();
    }
    ctx.restore();
  };

  // ==================== INNER SPLASH ====================
  // Inner drop fountain on click/explode. Same approach as ver2a.

  LavaOrb.prototype.spawnInnerDrops = function(count) {
    if (!this.innerDrops) this.innerDrops = [];
    const R = this.R, S = this.S;
    const tp = tempParams(this.val);
    const c = this.colors;
    const surfaceY = S * (1 - tp.fill);
    for (let i = 0; i < count; i++) {
      this.innerDrops.push({
        x: (Math.random() - 0.5) * R * 0.3,
        y: surfaceY - R,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -2 - Math.random() * 3,
        size: 1.5 + Math.random() * 2.5,
        life: 1,
        color: c[~~(Math.random() * 3)],
        stuck: false, stuckTimer: 0, stuckX: 0, stuckY: 0,
        dripping: false
      });
    }
  };

  // Note: innerDrops physics is in lava-orb.js update()
};

// ========== public/group.js ==========
// OrbGroup — registry of LavaOrb instances + shared rAF loop + inter-orb events.
// Orbs in the same group interact (collisions, ice+fire explosion).
// Orbs in DIFFERENT groups are fully isolated.

/**
 * Minimal event emitter for Group.
 */
class Emitter {
  constructor() { this._handlers = {}; }
  on(event, fn) {
    (this._handlers[event] = this._handlers[event] || []).push(fn);
    return () => this.off(event, fn);
  }
  off(event, fn) {
    const arr = this._handlers[event];
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }
  emit(event, ...args) {
    const arr = this._handlers[event];
    if (arr) arr.forEach(fn => fn(...args));
  }
}

/**
 * OrbGroup — container for a group of orbs with a shared rAF loop.
 *
 * @param {Object} [opts]
 * @param {string} [opts.name='default'] — group name (for debugging)
 * @param {boolean} [opts.interactions=true] — enable collisions between orbs
 * @param {HTMLElement} [opts.container=document.body] — root element (for listeners)
 */
class OrbGroup extends Emitter {
  constructor(opts = {}) {
    super();
    this.name = opts.name || 'default';
    this.container = opts.container || document.body;
    this.interactions = opts.interactions !== false;

    /** @type {{orb: LavaOrb, handle: Object}[]} */
    this._entries = [];
    this._animId = null;
    this._lastFrameTime = 0;
    this._running = false;
  }

  /**
   * Register an orb in the group. Returns a handle.
   * Called from attach.js.
   * @param {LavaOrb} orb
   * @param {Object} handle — public handle for control
   */
  _register(orb, handle) {
    this._entries.push({ orb, handle });
    if (!this._running) this._start();
    this.emit('attach', handle);
  }

  _unregister(handle) {
    const idx = this._entries.findIndex(e => e.handle === handle);
    if (idx !== -1) {
      this._entries.splice(idx, 1);
      this.emit('detach', handle);
    }
    if (this._entries.length === 0) this._stop();
  }

  /** List all active handles in the group. */
  listOrbs() {
    return this._entries.map(e => e.handle);
  }

  /** Orb count. */
  get size() { return this._entries.length; }

  // ==================== rAF LOOP ====================

  _start() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = 0;
    const tick = (timestamp) => {
      if (!this._running) return;
      let dt = 1.0;
      if (this._lastFrameTime > 0) {
        const elapsed = timestamp - this._lastFrameTime;
        dt = Math.min(elapsed / 16.667, 3.0);
      }
      this._lastFrameTime = timestamp;

      for (let i = 0; i < this._entries.length; i++) {
        const { orb } = this._entries[i];
        try {
          orb.update(dt);
          orb.draw(dt);
        } catch (e) {
          console.error('[LavaOrb] draw error:', e);
        }
      }

      // Detach physics (if detach-mixin installed _updateDetached)
      if (this._updateDetached) this._updateDetached(dt);

      // Collision detection (if enabled and >1 orb)
      if (this.interactions && this._entries.length > 1) {
        this._checkCollisions(dt);
      }

      // FX overlay (cinematic explosion) — called if explosion-mixin installed _updateFX
      if (this._updateFX) this._updateFX(dt);

      this._animId = requestAnimationFrame(tick);
    };
    this._animId = requestAnimationFrame(tick);
  }

  _stop() {
    this._running = false;
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _checkCollisions(dt) {
    // Only check detached orbs (on-track orbs don't collide — UX reason).
    const detached = this._entries.filter(e => e.orb._detached && e.orb._detachState);
    if (detached.length < 2) return;

    // Cooldown between big (ice+fire) explosions
    if (this._colCooldown > 0) { this._colCooldown -= dt; return; }

    const firstOrb = this._entries[0].orb;
    const TUNE = firstOrb.TUNE || {};
    const hotT = TUNE.hotThresh || 7, coldT = TUNE.coldThresh || 3;

    for (let a = 0; a < detached.length; a++) {
      for (let b = a + 1; b < detached.length; b++) {
        const ea = detached[a], eb = detached[b];
        const sa = ea.orb._detachState, sb = eb.orb._detachState;
        if ((sa.settled && sb.settled) || (sa.dragging && sb.dragging)) continue;

        const orbS = ea.orb.S;
        const ax = sa.fx + orbS / 2, ay = sa.fy + orbS / 2;
        const bx = sb.fx + orbS / 2, by = sb.fy + orbS / 2;
        const ddx = bx - ax, ddy = by - ay;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const minDist = orbS * (TUNE.colDist || 0.9);

        if (dist < minDist && dist > 0) {
          // Separate + elastic bounce
          const nx = ddx / dist, ny = ddy / dist;
          const overlap = (minDist - dist) / 2;
          if (!sa.dragging) { sa.fx -= nx * overlap; sa.fy -= ny * overlap; }
          if (!sb.dragging) { sb.fx += nx * overlap; sb.fy += ny * overlap; }

          const relVx = sa.fvx - sb.fvx, relVy = sa.fvy - sb.fvy;
          const relDot = relVx * nx + relVy * ny;
          if (relDot > 0) {
            const e = TUNE.colElastic || 0.8;
            if (!sa.dragging) { sa.fvx -= relDot * nx * e; sa.fvy -= relDot * ny * e; }
            if (!sb.dragging) { sb.fvx += relDot * nx * e; sb.fvy += relDot * ny * e; }
          }
          sa.settled = false; sb.settled = false;

          // Orbs explode on impact
          if (ea.orb.explode) ea.orb.explode();
          if (eb.orb.explode) eb.orb.explode();

          // Collision sparks at impact point
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          if (this.spawnCollisionFX) this.spawnCollisionFX(mx, my, false);

          // Ice+fire blast — cinematic + blow other orbs off their tracks
          const va = parseInt(ea.handle.input?.value || ea.orb.val);
          const vb = parseInt(eb.handle.input?.value || eb.orb.val);
          const oneHot = va >= hotT || vb >= hotT;
          const oneCold = va <= coldT || vb <= coldT;
          if (oneHot && oneCold && TUNE.colHotColdEnabled !== 0) {
            if (this.cinematicExplosion) this.cinematicExplosion(mx, my);
            this._colCooldown = TUNE.colCooldown || 30;

            const blastForce = TUNE.colBlast || 40;
            if (!sa.dragging) { sa.fvx = -nx * blastForce; sa.fvy = -ny * blastForce - 15; }
            if (!sb.dragging) { sb.fvx = nx * blastForce; sb.fvy = ny * blastForce - 15; }
            this.emit('ice-fire-collision', { x: mx, y: my });
          }
        }
      }
    }
  }

  // ==================== CLEANUP ====================

  destroy() {
    this._stop();
    // Destroy each handle (triggers _unregister)
    while (this._entries.length > 0) {
      this._entries[0].handle.destroy();
    }
    this._handlers = {};
  }
}

// ========== fx/detach.js ==========
// Detach physics — orb detaches from slider on fast drag past edge,
// flies with gravity, bounces off floor/walls, returns on drop near track.
// Install: installDetach(LavaOrb, OrbGroup) extends both.

function installDetach(LavaOrb, OrbGroup) {
  /**
   * setWorldPos — shift all external particles by delta so they remain
   * in world coordinates when the orb canvas moves. Called during detached flight.
   */
  LavaOrb.prototype.setWorldPos = function(fx, fy) {
    const dx = fx - this._prevFx;
    const dy = fy - this._prevFy;
    this._prevFx = fx;
    this._prevFy = fy;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

    // Shift all active pools
    const pools = [this.fireParticles, this.fireSparks, this.fireSmoke, this.lavaDrops, this.explosion];
    for (const pool of pools) {
      if (!pool) continue;
      for (const p of pool) {
        if (p.active) { p.x -= dx; p.y -= dy; }
      }
    }
    // Snowflakes — always active, no active flag
    if (this.snowflakes) {
      for (const s of this.snowflakes) { s.x -= dx; s.y -= dy; }
    }
  };

  /**
   * detach — detach orb from slider into a floater div.
   * Returns a state object for tracking physics.
   */
  LavaOrb.prototype.detach = function(orbEl, velocity = 0) {
    if (this._detached) return this._detachState;

    this._detached = true;
    const rect = orbEl.getBoundingClientRect();
    const size = this.S;

    // Floater — fixed div where canvases will be moved
    const floater = document.createElement('div');
    floater.className = 'lava-orb lava-orb-floater';
    floater.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;` +
      `width:${size}px;height:${size}px;z-index:9999;overflow:visible;` +
      `pointer-events:none;transform:none;`;

    // Move canvases from orbEl to floater
    const canvases = orbEl.querySelectorAll('canvas');
    for (const c of canvases) {
      c.style.pointerEvents = 'none';
      floater.appendChild(c);
    }
    document.body.appendChild(floater);

    // Hide original orbEl
    orbEl.style.opacity = '0';

    const state = {
      orb: this,
      origEl: orbEl,
      floater: floater,
      fx: rect.left,
      fy: rect.top,
      fvx: velocity * 0.8,
      fvy: -2,
      bounces: 0,
      settled: false,
      dragging: false,
      dragOffX: 0,
      dragOffY: 0
    };
    this._detachState = state;
    this._prevFx = rect.left;
    this._prevFy = rect.top;
    return state;
  };

  /**
   * reattach — return orb to slider (with animation).
   */
  LavaOrb.prototype.reattach = function() {
    if (!this._detached || !this._detachState) return;
    const st = this._detachState;
    const orbEl = st.origEl;
    const floater = st.floater;

    // Reset physics
    this._moveVx = 0;
    this._moveVy = 0;
    if (this.fireBuf) this.fireBuf.fill && this.fireBuf.fill(0);
    if (this.doomFireBuf) this.doomFireBuf.fill(0);
    // Clear active pools
    const pools = [this.fireParticles, this.fireSparks, this.lavaDrops, this.explosion];
    for (const pool of pools) {
      if (!pool) continue;
      for (const p of pool) p.active = false;
    }

    // Target rect — where orbEl was originally
    const targetRect = orbEl.getBoundingClientRect();

    // Move canvases back
    const canvases = floater.querySelectorAll('canvas');
    for (const c of canvases) {
      c.style.pointerEvents = '';
      orbEl.appendChild(c);
    }

    // Animate floater → orbEl position
    floater.style.transition = 'left 0.4s ease-out, top 0.4s ease-out';
    floater.style.left = targetRect.left + 'px';
    floater.style.top = targetRect.top + 'px';

    setTimeout(() => {
      orbEl.style.opacity = '1';
      if (floater.parentNode) floater.parentNode.removeChild(floater);
      this._detached = false;
      this._detachState = null;
      this._prevFx = 0;
      this._prevFy = 0;
    }, 450);
  };

  // ==================== GROUP EXTENSIONS ====================

  /**
   * Activate detach physics for a group: tick loop calls _updateDetached(dt),
   * document-listeners handle drag on the group's floaters.
   */
  const origStart = OrbGroup.prototype._start;
  OrbGroup.prototype._start = function() {
    if (!this._detachListenersInstalled) {
      _installDragListeners(this);
      this._detachListenersInstalled = true;
    }
    origStart.call(this);
  };

  /**
   * Physics update for all detached orbs in the group.
   * Called from group.js tick loop automatically if the method exists.
   */
  OrbGroup.prototype._updateDetached = function(dt) {
    const floor = window.innerHeight - 60 - 5;  // 60 = default size; orb._detachState.orb.S more precise
    const gravity = 0.15;
    const bounce = 0.65;

    for (const entry of this._entries) {
      const orb = entry.orb;
      if (!orb._detached || !orb._detachState) continue;
      const st = orb._detachState;
      if (st.settled || st.dragging) continue;

      const prevVx = st.fvx, prevVy = st.fvy;
      const floorY = window.innerHeight - orb.S - 5;

      // Gravity + drag
      st.fvy += gravity * 3.3 * dt;
      st.fvx *= Math.pow(0.998, dt);
      st.fx += st.fvx * dt;
      st.fy += st.fvy * dt;

      // Floor bounce
      if (st.fy >= floorY) {
        st.fy = floorY;
        st.fvy = -st.fvy * bounce;
        st.fvx *= Math.pow(0.92, dt);
        st.bounces++;
        if (Math.abs(st.fvy) > 3 && orb.explode) orb.explode();

        // Accelerate death of old fire particles on bounce —
        // otherwise trail flips abruptly (old go up, new go down).
        if (orb.fireParticles) {
          for (const p of orb.fireParticles) {
            if (p.active) p.life = Math.max(p.life, p.maxLife * 0.85);
          }
        }
        if (orb.fireSparks) {
          for (const s of orb.fireSparks) {
            if (s.active && s.life > 2) s.life = 2;
          }
        }
      }

      // Wall bounces
      if (st.fx < 0) { st.fx = 0; st.fvx = -st.fvx * 0.6; }
      if (st.fx > window.innerWidth - orb.S) {
        st.fx = window.innerWidth - orb.S;
        st.fvx = -st.fvx * 0.6;
      }
      if (st.fy < 0) { st.fy = 0; st.fvy = -st.fvy * 0.6; }

      // Apply forces to liquid (sloshing from acceleration)
      const dvx = st.fvx - prevVx;
      const dvy = st.fvy - prevVy;
      if (Math.abs(dvx) > 0.3 || Math.abs(dvy) > 0.5) {
        if (orb.applyForce) orb.applyForce(-dvx * 0.6 * orb.TUNE.sloshing);
        orb.velocity += dvy * 0.1 * orb.TUNE.sloshing;
      }

      // Set world position + velocity for fire/trails
      orb.setWorldPos(st.fx, st.fy);
      orb._moveVx = st.fvx;
      orb._moveVy = st.fvy;
      orb._velocityExternallyDriven = true;

      // Update floater position
      st.floater.style.left = st.fx + 'px';
      st.floater.style.top = st.fy + 'px';

      // Natural settle — on floor, nearly motionless
      if (st.fy >= floorY - 1 && Math.abs(st.fvy) < 0.5 && Math.abs(st.fvx) < 0.2) {
        st.fy = floorY;
        st.fvx = 0; st.fvy = 0;
        st.settled = true;
        st.floater.style.top = floorY + 'px';
      }
    }
  };

}

// ==================== DRAG LISTENERS ====================

function _installDragListeners(group) {
  const container = group.container || document;
  let dragState = null;
  const history = [];

  container.addEventListener('mousedown', (e) => {
    // Find a detached orb under cursor in this group
    for (const entry of group._entries) {
      const orb = entry.orb;
      if (!orb._detached || !orb._detachState) continue;
      const st = orb._detachState;
      if (st.dragging) continue;
      const cx = st.fx + orb.S / 2;
      const cy = st.fy + orb.S / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      if (dist < orb.S * 0.6) {
        dragState = st;
        st.dragging = true;
        st.settled = false;
        st.dragOffX = e.clientX - st.fx;
        st.dragOffY = e.clientY - st.fy;
        st.fvx = 0; st.fvy = 0;
        history.length = 0;
        history.push({ x: e.clientX, y: e.clientY, t: Date.now() });
        e.preventDefault();
        return;
      }
    }
  });

  container.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    const st = dragState;
    const prevFx = st.fx, prevFy = st.fy;
    st.fx = e.clientX - st.dragOffX;
    st.fy = e.clientY - st.dragOffY;
    st.floater.style.left = st.fx + 'px';
    st.floater.style.top = st.fy + 'px';
    st.fvx = st.fx - prevFx;
    st.fvy = st.fy - prevFy;
    st.orb.setWorldPos(st.fx, st.fy);
    st.orb._moveVx = st.fvx;
    st.orb._moveVy = st.fvy;
    st.orb._velocityExternallyDriven = true;
    history.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (history.length > 5) history.shift();
  });

  container.addEventListener('mouseup', (e) => {
    if (!dragState) return;
    const st = dragState;
    st.dragging = false;
    dragState = null;

    // Check if near the original slider
    const origRect = st.origEl.getBoundingClientRect();
    const orbCx = st.fx + st.orb.S / 2;
    const orbCy = st.fy + st.orb.S / 2;
    const near = orbCy > origRect.top - 50 && orbCy < origRect.bottom + 50 &&
                 orbCx > origRect.left - 30 && orbCx < origRect.right + 30;

    if (near) {
      st.orb.reattach();
    } else if (history.length >= 2) {
      // Throw — compute throw velocity from mouse history
      const last = history[history.length - 1];
      const first = history[0];
      const dt = (last.t - first.t) || 1;
      let throwVx = (last.x - first.x) / dt * 16;
      let throwVy = (last.y - first.y) / dt * 16;
      const maxThrow = 25;
      throwVx = Math.max(-maxThrow, Math.min(maxThrow, throwVx));
      throwVy = Math.max(-maxThrow, Math.min(maxThrow, throwVy));
      st.fvx = throwVx;
      st.fvy = throwVy;
      st.bounces = 0;
    }
    history.length = 0;
  });
}

// ========== fx/explosion.js ==========
// Cinematic explosion — viewport-level FX layer for a group of orbs.
// Includes: multi-stage particle bursts, fireballs, shockwave rings, bloom, screen flash, screen shake.
// Installed on OrbGroup — one FX canvas per group.

function installExplosion(OrbGroup) {

  /**
   * Initialize FX state on the group. Lazily called on first FX event.
   */
  OrbGroup.prototype._initFX = function() {
    if (this._fxState) return;
    this._fxState = {
      particles: [],
      fireballs: [],
      shockwaves: [],
      flash: 0,
      shakeTrauma: 0,
      collisionCooldown: 0,
      canvas: null,
      ctx: null,
      bloomCvs: null,
      bloomCtx: null,
      timers: []  // for cancelTimeout on destroy
    };
  };

  /**
   * Create or reuse viewport-sized FX canvas.
   */
  OrbGroup.prototype._getFXCanvas = function() {
    this._initFX();
    const s = this._fxState;
    const w = window.innerWidth, h = window.innerHeight;
    if (!s.canvas) {
      s.canvas = document.createElement('canvas');
      s.canvas.className = 'lava-orb-fx-canvas';
      s.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000;';
      s.canvas.width = w;
      s.canvas.height = h;
      document.body.appendChild(s.canvas);
      s.ctx = s.canvas.getContext('2d');
    } else if (s.canvas.width !== w || s.canvas.height !== h) {
      s.canvas.width = w;
      s.canvas.height = h;
    } else {
      s.ctx.clearRect(0, 0, w, h);
    }
    return s.ctx;
  };

  /** Add screen shake (0-1 multiplier). Accumulates, decays automatically. */
  OrbGroup.prototype.fxShake = function(amount) {
    this._initFX();
    this._fxState.shakeTrauma = Math.min(1, this._fxState.shakeTrauma + amount);
  };

  /** Screen flash (0-1 multiplier). */
  OrbGroup.prototype.fxFlash = function(amount) {
    this._initFX();
    this._fxState.flash = Math.max(this._fxState.flash, amount);
  };

  /**
   * Simple spark burst (for normal collisions). intense=true → triggers full cinematic.
   */
  OrbGroup.prototype.spawnCollisionFX = function(x, y, intense) {
    this._initFX();
    const s = this._fxState;
    if (!intense) {
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 8;
        s.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          size: 1.5 + Math.random() * 2.5, life: 1, maxLife: 0.3 + Math.random() * 0.3,
          age: 0, type: 'spark', gravity: 0.3, drag: 0.97, rot: 0, rotV: 0
        });
      }
      return;
    }
    this.cinematicExplosion(x, y);
  };

  /**
   * Full cinematic explosion with multi-stage timing.
   * Scaling parameters come from the first orb in the group (TUNE),
   * from opts, or defaults.
   */
  OrbGroup.prototype.cinematicExplosion = function(x, y, opts) {
    this._initFX();
    const s = this._fxState;
    opts = opts || {};
    const firstOrb = this._entries.length > 0 ? this._entries[0].orb : null;
    const TUNE = (firstOrb && firstOrb.TUNE) || {};

    const P = opts.blastPower || TUNE.blastPower || 1.0;
    const sparkCount = Math.round((opts.sparks || TUNE.sparks || 50) * P);
    const debrisCount = Math.round((opts.debris || TUNE.debris || 15) * P);
    const smokeCount = Math.round((opts.smoke || TUNE.smoke || 18) * P);
    const fireballR = (opts.fireball || TUNE.fireball || 120) * P;
    const shockR = (opts.shockwave || TUNE.shockwave || 350) * P;
    const flashAmount = (opts.flash || TUNE.flash || 0.9) * P;
    const shakeAmount = (opts.shake || TUNE.shake || 0.8) * P;

    // T=0: flash + shockwave + initial sparks + fireball
    this.fxFlash(flashAmount);
    this.fxShake(shakeAmount);
    s.shockwaves.push({ x, y, radius: 5, maxRadius: shockR, lineWidth: 45 * P, life: 1 });
    s.fireballs.push({ x, y, radius: 5, maxRadius: fireballR, age: 0, maxAge: 0.8 });

    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (10 + Math.random() * 15) * P;
      s.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: 1 + Math.random() * 2, life: 1, maxLife: 0.3 + Math.random() * 0.5,
        age: 0, type: 'spark', gravity: 0.3, drag: 0.97, rot: 0, rotV: 0
      });
    }

    // T=50ms: main fire burst
    s.timers.push(setTimeout(() => {
      s.fireballs.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, radius: 10, maxRadius: fireballR * 0.75, age: 0, maxAge: 0.6 });
      const fireCount = Math.round(30 * P);
      for (let i = 0; i < fireCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (2 + Math.random() * 6) * P;
        s.particles.push({
          x: x + (Math.random() - 0.5) * 15, y: y + (Math.random() - 0.5) * 15,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1,
          size: 8 + Math.random() * 20, life: 1, maxLife: 0.5 + Math.random() * 0.4,
          age: 0, type: 'fire', gravity: -0.4, drag: 0.95, rot: 0, rotV: 0
        });
      }
    }, 50));

    // T=100ms: debris + embers
    s.timers.push(setTimeout(() => {
      this.fxShake(shakeAmount * 0.3);
      for (let i = 0; i < debrisCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (4 + Math.random() * 9) * P;
        s.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
          size: 3 + Math.random() * 7, life: 1, maxLife: 1 + Math.random() * 1.5,
          age: 0, type: 'debris', gravity: 0.5, drag: 0.99,
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.3
        });
      }
      const emberCount = Math.round(35 * P);
      for (let j = 0; j < emberCount; j++) {
        const a2 = Math.random() * Math.PI * 2;
        const sp2 = (3 + Math.random() * 7) * P;
        s.particles.push({
          x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(a2) * sp2, vy: Math.sin(a2) * sp2 - 5,
          size: 1.5 + Math.random() * 3, life: 1, maxLife: 1 + Math.random() * 2,
          age: 0, type: 'ember', gravity: 0.15, drag: 0.995, rot: 0, rotV: 0
        });
      }
    }, 100));

    // T=200ms: secondary explosion (offset)
    s.timers.push(setTimeout(() => {
      const ox = (Math.random() - 0.5) * 60 * P;
      const oy = (Math.random() - 0.5) * 40 - 20;
      this.fxFlash(flashAmount * 0.45);
      this.fxShake(shakeAmount * 0.5);
      s.fireballs.push({ x: x + ox, y: y + oy, radius: 5, maxRadius: fireballR * 0.6, age: 0, maxAge: 0.5 });
      s.shockwaves.push({ x: x + ox, y: y + oy, radius: 5, maxRadius: shockR * 0.4, lineWidth: 20 * P, life: 1 });
      const sp2Count = Math.round(20 * P);
      for (let i = 0; i < sp2Count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (5 + Math.random() * 10) * P;
        s.particles.push({
          x: x + ox, y: y + oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          size: 1 + Math.random() * 2.5, life: 1, maxLife: 0.3 + Math.random() * 0.3,
          age: 0, type: 'spark', gravity: 0.3, drag: 0.97, rot: 0, rotV: 0
        });
      }
    }, 200));

    // T=350ms: smoke billows
    s.timers.push(setTimeout(() => {
      for (let i = 0; i < smokeCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        s.particles.push({
          x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
          size: 20 + Math.random() * 35, life: 1, maxLife: 2 + Math.random() * 2,
          age: 0, type: 'smoke', gravity: -0.12, drag: 0.97,
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.03
        });
      }
    }, 350));

    // T=600ms: late embers + lingering smoke
    s.timers.push(setTimeout(() => {
      const lateEmbers = Math.round(12 * P);
      for (let i = 0; i < lateEmbers; i++) {
        s.particles.push({
          x: x + (Math.random() - 0.5) * 60, y: y - Math.random() * 40,
          vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
          size: 1 + Math.random() * 2, life: 1, maxLife: 1.5 + Math.random() * 2,
          age: 0, type: 'ember', gravity: 0.08, drag: 0.998, rot: 0, rotV: 0
        });
      }
      const lateSmokeCount = Math.round(smokeCount * 0.45);
      for (let j = 0; j < lateSmokeCount; j++) {
        s.particles.push({
          x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.5, vy: -0.5 - Math.random() * 1,
          size: 25 + Math.random() * 30, life: 1, maxLife: 2.5 + Math.random() * 2,
          age: 0, type: 'smoke', gravity: -0.08, drag: 0.98,
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.02
        });
      }
    }, 600));
  };

  /**
   * Tick — update + render all FX elements. Called from group.js tick loop.
   * If nothing to render — cleanup canvas.
   */
  OrbGroup.prototype._updateFX = function(dt) {
    if (!this._fxState) return;
    const s = this._fxState;
    const hasWork = s.particles.length > 0 || s.fireballs.length > 0 || s.shockwaves.length > 0 || s.flash > 0.01;

    if (!hasWork) {
      if (s.canvas && s.canvas.parentNode) {
        s.canvas.parentNode.removeChild(s.canvas);
        s.canvas = null;
        s.ctx = null;
      }
      return;
    }

    const ctx = this._getFXCanvas();
    const W = s.canvas.width, H = s.canvas.height;
    const sdt = dt / 60;  // frame-rate independent: seconds per frame

    // === Screen shake (body margin) ===
    if (s.shakeTrauma > 0.01) {
      const shake = s.shakeTrauma * s.shakeTrauma;
      document.body.style.marginLeft = ((Math.random() * 2 - 1) * shake * 18) + 'px';
      document.body.style.marginTop = ((Math.random() * 2 - 1) * shake * 18) + 'px';
      s.shakeTrauma *= Math.pow(0.90, dt);
    } else if (s.shakeTrauma > 0) {
      document.body.style.marginLeft = '';
      document.body.style.marginTop = '';
      s.shakeTrauma = 0;
    }

    // === Update particles (compact dead) ===
    let writeIdx = 0;
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      p.age += sdt;
      if (p.age >= p.maxLife) continue;
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.rotV;
      if (writeIdx !== i) s.particles[writeIdx] = p;
      writeIdx++;
    }
    s.particles.length = writeIdx;

    // === LAYER 1: smoke (source-over) ===
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      if (p.type !== 'smoke') continue;
      const t = p.age / p.maxLife;
      const alpha = (t < 0.2 ? t / 0.2 : 1) * (1 - t) * 0.25;
      if (alpha < 0.01) continue;
      const grow = p.size * (1 + t * 3);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(55,50,45,' + (alpha * 3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, grow, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, grow * 1.4, 0, Math.PI * 2); ctx.fill();
    }

    // === LAYER 2: fireballs (lighter) ===
    ctx.globalCompositeOperation = 'lighter';
    for (let fi = s.fireballs.length - 1; fi >= 0; fi--) {
      const fb = s.fireballs[fi];
      fb.age += sdt;
      if (fb.age >= fb.maxAge) { s.fireballs.splice(fi, 1); continue; }
      const ft = fb.age / fb.maxAge;
      const eased = 1 - Math.pow(2, -10 * ft);
      fb.radius = 5 + (fb.maxRadius - 5) * eased;
      const fAlpha = (1 - ft) * (1 - ft);
      if (fAlpha < 0.01) continue;
      ctx.globalAlpha = fAlpha;
      const fg = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.radius);
      const coreA = Math.max(0, 1 - ft * 1.5);
      fg.addColorStop(0, 'rgba(255,255,220,' + coreA + ')');
      fg.addColorStop(0.2, 'rgba(255,180,60,' + (coreA * 0.8) + ')');
      fg.addColorStop(0.5, 'rgba(255,80,15,' + (fAlpha * 0.6) + ')');
      fg.addColorStop(1, 'rgba(60,10,5,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2); ctx.fill();
    }

    // === LAYER 3: shockwave rings ===
    for (let si = s.shockwaves.length - 1; si >= 0; si--) {
      const sw = s.shockwaves[si];
      sw.radius += (sw.maxRadius - sw.radius) * (1 - Math.pow(0.92, dt));
      sw.lineWidth *= Math.pow(0.96, dt);
      sw.life -= 0.02 * dt;
      if (sw.life <= 0) { s.shockwaves.splice(si, 1); continue; }
      ctx.globalAlpha = sw.life * 0.2;
      ctx.strokeStyle = 'rgba(255,200,100,1)';
      ctx.lineWidth = sw.lineWidth * 2;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = sw.life * 0.5;
      ctx.strokeStyle = 'rgba(255,240,220,1)';
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = sw.life * 0.7;
      ctx.lineWidth = sw.lineWidth * 0.15;
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.stroke();
    }

    // === LAYER 4: sparks/fire/ember/debris ===
    for (let i = 0; i < s.particles.length; i++) {
      const p = s.particles[i];
      if (p.type === 'smoke') continue;
      const t = p.age / p.maxLife;
      const alpha = 1 - t;
      if (alpha < 0.02) continue;

      if (p.type === 'spark') {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const len = speed * 3;
        const ang = Math.atan2(p.vy, p.vx);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(255,240,200,' + alpha + ')';
        ctx.lineWidth = p.size * alpha;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,240,1)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5 * alpha, 0, Math.PI * 2); ctx.fill();

      } else if (p.type === 'fire') {
        ctx.globalCompositeOperation = 'lighter';
        const fSize = p.size * (1 - t * 0.3);
        const g = Math.floor(80 + 170 * (1 - t));
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = 'rgba(255,' + g + ',' + Math.floor(20 * (1 - t)) + ',1)';
        ctx.beginPath(); ctx.arc(p.x, p.y, fSize, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = 'rgba(255,255,180,1)';
        ctx.beginPath(); ctx.arc(p.x, p.y, fSize * 0.4, 0, Math.PI * 2); ctx.fill();

      } else if (p.type === 'ember') {
        const flicker = 0.5 + 0.5 * Math.sin(p.age * 20 + p.x);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * flicker;
        ctx.fillStyle = 'rgba(255,' + Math.floor(100 + 120 * (1 - t)) + ',20,1)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2); ctx.fill();

      } else if (p.type === 'debris') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha;
        const sz = p.size;
        const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
        ctx.fillStyle = 'rgba(80,60,40,1)';
        ctx.beginPath();
        ctx.moveTo(p.x + (-sz) * cos - (-sz * 0.6) * sin, p.y + (-sz) * sin + (-sz * 0.6) * cos);
        ctx.lineTo(p.x + (sz * 0.8) * cos - (-sz * 0.4) * sin, p.y + (sz * 0.8) * sin + (-sz * 0.4) * cos);
        ctx.lineTo(p.x + (sz) * cos - (sz * 0.7) * sin, p.y + (sz) * sin + (sz * 0.7) * cos);
        ctx.lineTo(p.x + (-sz * 0.5) * cos - (sz) * sin, p.y + (-sz * 0.5) * sin + (sz) * cos);
        ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      }
    }

    // === LAYER 5: screen flash ===
    if (s.flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.flash;
      ctx.fillStyle = 'rgba(255,240,200,1)';
      ctx.fillRect(0, 0, W, H);
      s.flash *= Math.pow(0.82, dt);
    }

    // === LAYER 6: bloom (reuse canvas) ===
    if (s.fireballs.length > 0) {
      if (!s.bloomCvs) {
        s.bloomCvs = document.createElement('canvas');
        s.bloomCtx = s.bloomCvs.getContext('2d');
      }
      const bw = Math.max(1, W >> 2), bh = Math.max(1, H >> 2);
      if (s.bloomCvs.width !== bw) { s.bloomCvs.width = bw; s.bloomCvs.height = bh; }
      s.bloomCtx.clearRect(0, 0, bw, bh);
      s.bloomCtx.drawImage(s.canvas, 0, 0, bw, bh);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(s.bloomCvs, 0, 0, W, H);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // ==================== HOOK INTO TICK LOOP ====================

  /** Cleanup — cancel setTimeouts, remove canvas. */
  const origDestroy = OrbGroup.prototype.destroy;
  OrbGroup.prototype.destroy = function() {
    if (this._fxState) {
      this._fxState.timers.forEach(clearTimeout);
      if (this._fxState.canvas && this._fxState.canvas.parentNode) {
        this._fxState.canvas.parentNode.removeChild(this._fxState.canvas);
      }
      document.body.style.marginLeft = '';
      document.body.style.marginTop = '';
      this._fxState = null;
    }
    if (origDestroy) origDestroy.call(this);
  };
}

// ========== public/attach.js ==========
// Public API: LavaOrb.attach(input, options) → handle
// Accepts an existing <input type="range">, creates orb-wrapper next to it, registers in group.




/** Default group — if attach is called without specifying a group, the orb lands here. */
let _defaultGroup = null;
function getDefaultGroup() {
  if (!_defaultGroup) _defaultGroup = new OrbGroup({ name: 'default' });
  return _defaultGroup;
}

/**
 * @typedef {Object} AttachOptions
 * @property {number}   [size=60]        — orb diameter in pixels
 * @property {string}   [mode='full']    — 'lite' | 'full' | 'custom'
 * @property {Object}   [effects]        — feature flags: fire, frost, detach, explosion, smoke
 * @property {string}   [fireStyle='particles'] — 'particles' | 'doom'
 * @property {function|string} [palette='default'] — function (val, isDark) => string[4] or preset name
 * @property {OrbGroup} [group]          — group to join (default if unset)
 * @property {boolean}  [interactions=true] — collisions between orbs in the group
 * @property {function} [onChange]       — callback fired on slider value change
 */

/**
 * Main method — bind an effect to a range input.
 * @param {HTMLInputElement} input
 * @param {AttachOptions} [options]
 * @returns {Object} handle — {setVal, setMode, explode, destroy, isAlive, orb, ...}
 */
function attach(input, options = {}) {
  if (!input || input.tagName !== 'INPUT' || input.type !== 'range') {
    throw new Error('LavaOrb.attach: input must be <input type="range">');
  }

  const size = options.size || 60;
  const group = options.group || getDefaultGroup();
  const paletteFn = typeof options.palette === 'function' ? options.palette : getPalette;
  const onChange = options.onChange || null;
  // Extra padding on each side when clamping orb position inside wrapper.
  // Useful when the wrapper has neighbors (e.g. a value badge) and the fire-canvas
  // extending beyond the orb would overlap them. Default 0 — just clamp by half-orb.
  const clampPad = options.clampPad || 0;

  // === Build DOM structure ===
  // Find nearest parent to insert the orb. If input has a wrapper, reuse it.
  let wrapper = input.closest('.lava-orb-wrapper');
  if (!wrapper) {
    // Create wrapper around input.
    // display:flex + align-items:center — so if input has flex:1 CSS, it still works inside wrapper.
    // flex:1 on wrapper itself — so it stretches in flex-parent (slider-row).
    // width:100% — fallback for non-flex parents.
    // position:relative — required for absolute orbEl inside.
    const parent = input.parentElement;
    wrapper = document.createElement('div');
    wrapper.className = 'lava-orb-wrapper';
    wrapper.style.cssText = 'position:relative;display:flex;align-items:center;flex:1;width:100%;min-width:0;';
    parent.insertBefore(wrapper, input);
    wrapper.appendChild(input);
  }

  // Canvas overlay — positioned over the track at the thumb position
  const orbEl = document.createElement('div');
  orbEl.className = 'lava-orb';
  orbEl.style.cssText = `position:absolute;width:${size}px;height:${size}px;` +
    'border-radius:50%;transform:translateX(-50%);pointer-events:none;' +
    'top:50%;margin-top:-' + (size / 2) + 'px;' +
    'overflow:visible;z-index:2;';

  // Orb canvas rendered FIRST — under the fire. The orb itself is visible.
  const orbCanvas = document.createElement('canvas');
  orbCanvas.className = 'lava-orb-canvas';
  orbCanvas.style.cssText = 'display:block;border-radius:50%;position:relative;z-index:1;background:transparent;';
  orbEl.appendChild(orbCanvas);

  // Fire canvas rendered OVER the orb with blend-mode screen — bright fire pixels "burn through" the orb,
  // dark/transparent don't affect. Fire visually wraps around the sphere.
  // mask-image radial-gradient makes the canvas visually circular — otherwise rectangular 360×360 edges show during flight.
  const fireCanvas = document.createElement('canvas');
  fireCanvas.className = 'lava-orb-fire';
  fireCanvas.style.cssText = 'position:absolute;pointer-events:none;background:transparent;' +
    'z-index:2;mix-blend-mode:screen;' +
    'mask-image:radial-gradient(circle at center,black 55%,transparent 90%);' +
    '-webkit-mask-image:radial-gradient(circle at center,black 55%,transparent 90%);';
  orbEl.appendChild(fireCanvas);

  wrapper.appendChild(orbEl);

  // === Create LavaOrb ===
  const orb = new LavaOrb(orbCanvas, fireCanvas, size, {
    tune: options.tune,
    fire: options.fire,
    liquid: options.liquid
  });

  // Initial position & colors
  const isDark = () => document.body.getAttribute('data-theme') === 'dark';
  const syncFromInput = () => {
    const v = parseFloat(input.value);
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 10;
    const rawPct = ((v - min) / (max - min)) * 100;

    // Clamp orb center to stay within wrapper — half-orb-size + clampPad offset on each side.
    // Prevents the orb (and its fire aura) from overflowing into siblings like a value-badge.
    // If wrapper layout is not ready (width 0 or smaller than orb) — skip clamp,
    // otherwise halfPct would explode and pin every orb to 50%. ResizeObserver below
    // re-runs this once real layout arrives.
    const wrapperW = wrapper.getBoundingClientRect().width || 0;
    let pct;
    if (wrapperW < size) {
      pct = rawPct;
    } else {
      const edgeOffsetPx = size / 2 + clampPad;
      const halfPct = (edgeOffsetPx / wrapperW) * 100;
      pct = Math.max(halfPct, Math.min(100 - halfPct, rawPct));
    }
    orbEl.style.left = pct + '%';

    // Map slider value to palette val (1-10)
    const orbVal = Math.round(1 + ((v - min) / (max - min)) * 9);
    const pal = paletteFn(orbVal, isDark());
    orb.setVal(orbVal);
    orb.setColors(pal);
    return { v, pct: rawPct, orbVal };  // return rawPct for delta calc
  };
  syncFromInput();
  // Re-sync after layout settles — wrapper width can be 0 on first paint
  // (orb ends up stuck at 50% because halfPct clamp explodes).
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(syncFromInput);
  }

  // ResizeObserver — keep orb position correct on window resize,
  // theme toggle, or any late layout shift (accordions, tabs, dynamic CSS).
  let _ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    _ro = new ResizeObserver(() => syncFromInput());
    _ro.observe(wrapper);
  }

  // === Input listener ===
  let lastPct = -1, lastTime = 0;
  const enableDetach = options.detach !== false;
  const inputHandler = () => {
    const { v, pct, orbVal } = syncFromInput();
    // applyForce on drag
    const now = Date.now();
    if (lastPct >= 0 && now - lastTime < 150) {
      const delta = pct - lastPct;
      const trackWidth = input.getBoundingClientRect().width || 300;
      orb._moveVx = (delta / 100) * trackWidth * 0.3;
      orb._moveVy = 0;
      orb._velocityExternallyDriven = true;
      orb.applyForce(delta * 0.15 * orb.TUNE.sloshing);

      // Detach trigger — fast drag past edge. Only if mixin is installed.
      if (enableDetach && orb.detach && !orb._detached) {
        if (delta > 25 && pct >= 95) {
          orb.detach(orbEl, delta);
        } else if (delta < -25 && pct <= 5 && orbVal <= 3) {
          orb.detach(orbEl, delta);
        }
      }
    }
    lastPct = pct;
    lastTime = now;
    if (onChange) onChange(v);
  };
  input.addEventListener('input', inputHandler);

  // === Handle — public object for orb control ===
  let alive = true;
  const handle = {
    orb,
    input,
    wrapper,
    orbEl,
    size,

    setVal(v) { if (alive) orb.setVal(v); },
    setColors(pal) { if (alive) orb.setColors(pal); },
    setMode(mode) {
      // MVP — only 'full' works. Session B — real mode switching.
      handle.mode = mode;
    },
    setFireStyle(style) {
      if (alive) orb.FIRE.style = style;
    },
    explode() { if (alive) orb.explode(); },

    isAlive() { return alive; },

    destroy() {
      if (!alive) return;
      alive = false;
      input.removeEventListener('input', inputHandler);
      if (_ro) { _ro.disconnect(); _ro = null; }
      if (orbEl.parentNode) orbEl.parentNode.removeChild(orbEl);
      group._unregister(handle);
    }
  };

  // Store reverse reference on input — so repeat attach doesn't duplicate
  input._lavaOrb = handle;

  group._register(orb, handle);
  return handle;
}

/**
 * Create an isolated group. Useful for multiple independent sections on one page.
 */
function createGroup(opts) {
  return new OrbGroup(opts);
}

/**
 * Return handle previously bound to input. null if not bound.
 */
function getByInput(input) {
  return input && input._lavaOrb && input._lavaOrb.isAlive() ? input._lavaOrb : null;
}

// ========== index.js ==========
// Public entry point. All API exposed through the `LavaOrb` namespace.
//
// Usage:
//   import LavaOrbAPI from './src/index.js';
//   LavaOrbAPI.attach(inputEl, { size: 44 });
//
// Or via IIFE bundle (dist/lava-orb.js) — window.LavaOrb.attach(...)






// Install effect mixins on LavaOrb prototype






installFireDoom(LavaOrb);
installFireParticles(LavaOrb);
installFrost(LavaOrb);
installParticles(LavaOrb);
installDetach(LavaOrb, OrbGroup);
installExplosion(OrbGroup);

const LavaOrbAPI = {
  attach,
  createGroup,
  getByInput,
  LavaOrb,
  OrbGroup,
  getPalette,
  getBadgeColor,
  tempParams,
  VERSION: '0.1.0'
};

// In browser — attach to window for IIFE compatibility
if (typeof window !== 'undefined') {
  window.LavaOrb = LavaOrbAPI;
}

LavaOrbAPI;
{ attach, createGroup, getByInput, LavaOrb, OrbGroup, getPalette, getBadgeColor, tempParams };

})(typeof window !== "undefined" ? window : this);