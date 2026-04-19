// LavaOrb class — core class. Liquid + waves + embers + glass + bubbles + cracks + inner drops.
// Effects (fire, frost, detach, explosion, lava drops) are added as mixins via installXxx()
// from orb/*.js and fx/*.js modules.

import { tempParams } from '../core/temp-params.js';
import { cloneConfig, TUNE_DEFAULTS, FIRE_DEFAULTS, LIQUID_DEFAULTS } from '../core/config.js';

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
export class LavaOrb {
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
