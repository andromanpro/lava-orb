// Helpers — math + particle pool API + pre-rendered sprites.

/**
 * Linear interpolation between two angles (with ±π wrap handling).
 */
export function blendAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/** clamp(x, min, max) */
export const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

// ========== Particle pool API ==========
// Pool = plain Array. An `active: true/false` flag on objects controls lifecycle.
// poolAlloc — find free slot or push new. Returns the object to populate.
// poolKill — mark as inactive (reusable).
// poolCount — count active.

export function poolAlloc(pool, obj) {
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

export function poolKill(pool, idx, p) {
  p.active = false;
}

export function poolCount(pool) {
  let n = 0;
  for (let i = 0; i < pool.length; i++) if (pool[i].active) n++;
  return n;
}

export function poolClear(pool) {
  for (let i = 0; i < pool.length; i++) pool[i].active = false;
}

// ========== Pre-rendered sprites ==========
// Created once, reused via drawImage. Saves createRadialGradient per frame.

let _glowSprite = null;
export function getGlowSprite() {
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
export function getSmokeSprite() {
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
