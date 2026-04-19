// Fire particles — spawn-based fire (ver3 approach).
// Install: installFireParticles(LavaOrb) adds methods to prototype.
// Activated when FIRE.style === 'particles'.

import { tempParams } from '../core/temp-params.js';
import { poolAlloc, poolKill, poolCount, blendAngle } from '../core/helpers.js';

export function installFireParticles(LavaOrb) {
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
