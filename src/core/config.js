// Default configs — copied from ver3a. User can override via options in attach().

/** Global tuning parameters for visuals/physics. */
export const TUNE_DEFAULTS = {
  speed: 1.0,         // animation speed multiplier
  intensity: 1.0,     // fire/frost intensity
  fxRadius: 0.6,      // FX radius as fraction of fire-canvas
  gravity: 0.15,      // gravity for drops and detached orbs
  particles: 60,      // particle pool size
  sloshing: 1.0,      // liquid sloshing force on movement
  bounce: 0.65,       // floor bounce restitution
  trail: 1.5,         // fire trail multiplier

  // Explosion
  blastPower: 1.0,
  fireball: 120,
  shockwave: 350,
  shake: 0.8,
  flash: 0.9,
  debris: 15,
  smoke: 18,
  sparks: 50,

  // Collision
  colDist: 0.9,
  colElastic: 0.8,
  colBlast: 40,
  colCooldown: 30,
  hotThresh: 7,
  coldThresh: 3,
  colHotColdEnabled: 1,
  colHotHotEnabled: 1,
  colColdColdEnabled: 1,
  colHotHotForce: 20,
  colHotHotCooldown: 15,
  colColdColdForce: 12,
  colColdColdCooldown: 20,
  colMergeEnabled: 1,
  colMergeSpeedThresh: 6,
  colMergeDuration: 150,
  colMergeForce: 10
};

/** Fire config (particle path + DOOM). */
export const FIRE_DEFAULTS = {
  fire: true,
  smokeMove: true,
  smokeIdle: false,
  sparks: true,
  maxParticles: 261,
  sparkRate: 4,
  fadeAlpha: 0.2,
  baseSize: 19,
  baseLife: 10,
  turbulence: 0.1,
  taper: 0,
  flameHeight: 0.5,
  flameWidth: 0.2,
  spawnArc: 360,
  spawnOffset: 0.9,
  buoyancy: 0,
  glowIntensity: 0,
  glowSize: 2.5,
  fireSpeed: 0.7,
  smokeSize: 14,
  smokeHeight: 1.9,
  smokePuff: 2,

  // DOOM mode (from ver1)
  style: 'particles',  // 'particles' | 'doom'
  doomRes: 2,
  doomIntensity: 1.0,
  doomTrailPower: 1.0
};

/** Liquid config. Working params marked ✓, TODO — not implemented. */
export const LIQUID_DEFAULTS = {
  fill: 0,           // ✓ Fill override (0 = use tempParams, >0 = absolute value)
  cols: 24,          // ✓ Wave column count
  spring: 0.05,      // ✓ Wave spring strength
  damping: 0.975,    // ✓ Wave damping
  spread: 0.25,      // ✓ Wave propagation between neighbors
  substeps: 4,       // ✓ Physics substeps per frame
  layers: 3,         // ✓ Gradient layer count (1-5)
  surfaceGlow: true, // ✓ Surface glow at val >= 5
  embers: true,      // ✓ Ember particles inside orb
  bubbles: true,     // ✓ Bubbles in liquid
  cracks: 4,         // ✓ Glass cracks at val 1 and 10
  glass: true,       // ✓ Glass highlight + rim

  sloshing: 1.2,     // TODO: currently TUNE.sloshing is used
  innerSplash: 10,   // TODO: inner fountain on click
  outerSplash: 5     // TODO: outer splash on impact
};

/** Performance tuning (auto-adaptation). */
export const PERF_DEFAULTS = {
  gradCutoff: 3.0,    // particle size below which flat circle is used (no radialGradient)
  shadowBlur: 1.0,    // shadowBlur multiplier (0 = disabled)
  viewportCull: true  // skip rendering orbs outside viewport
};

/**
 * Shallow copy defaults (so mutations don't break the source).
 */
export function cloneConfig(defaults) {
  const out = {};
  for (const k in defaults) out[k] = defaults[k];
  return out;
}
