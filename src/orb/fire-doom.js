// DOOM fire — cellular automaton (retro pixel fire).
// Install: installFireDoom(LavaOrb) adds methods to prototype.
// Activated via FIRE_CFG.style = 'doom'.

import { FIRE_PALETTE } from '../core/palettes.js';
import { tempParams } from '../core/temp-params.js';

export function installFireDoom(LavaOrb) {
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
