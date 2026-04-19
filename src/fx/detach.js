// Detach physics — orb detaches from slider on fast drag past edge,
// flies with gravity, bounces off floor/walls, returns on drop near track.
// Install: installDetach(LavaOrb, OrbGroup) extends both.

export function installDetach(LavaOrb, OrbGroup) {
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
