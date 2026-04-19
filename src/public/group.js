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
export class OrbGroup extends Emitter {
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
