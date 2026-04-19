// Particles mixin — lava drops (dripping from orb) + inner splash (fountain inside).
// Install: installParticles(LavaOrb).
// Adds: updateLavaDrops, drawLavaDrops, spawnInnerDrops, drawInnerDrops.

import { tempParams } from '../core/temp-params.js';

export function installParticles(LavaOrb) {

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
