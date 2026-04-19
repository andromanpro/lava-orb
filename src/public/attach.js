// Public API: LavaOrb.attach(input, options) → handle
// Accepts an existing <input type="range">, creates orb-wrapper next to it, registers in group.

import { LavaOrb } from '../orb/lava-orb.js';
import { OrbGroup } from './group.js';
import { getPalette } from '../core/palettes.js';

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
export function attach(input, options = {}) {
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
export function createGroup(opts) {
  return new OrbGroup(opts);
}

/**
 * Return handle previously bound to input. null if not bound.
 */
export function getByInput(input) {
  return input && input._lavaOrb && input._lavaOrb.isAlive() ? input._lavaOrb : null;
}
