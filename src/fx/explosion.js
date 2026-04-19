// Cinematic explosion — viewport-level FX layer for a group of orbs.
// Includes: multi-stage particle bursts, fireballs, shockwave rings, bloom, screen flash, screen shake.
// Installed on OrbGroup — one FX canvas per group.

export function installExplosion(OrbGroup) {

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
