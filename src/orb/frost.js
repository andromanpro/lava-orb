// Frost — snowflakes around orb at val <= 2.
// Install: installFrost(LavaOrb) adds methods + snowflake init.

import { tempParams } from '../core/temp-params.js';

export function installFrost(LavaOrb) {
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
