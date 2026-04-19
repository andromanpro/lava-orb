// Public entry point. All API exposed through the `LavaOrb` namespace.
//
// Usage:
//   import LavaOrbAPI from './src/index.js';
//   LavaOrbAPI.attach(inputEl, { size: 44 });
//
// Or via IIFE bundle (dist/lava-orb.js) — window.LavaOrb.attach(...)

import { attach, createGroup, getByInput } from './public/attach.js';
import { OrbGroup } from './public/group.js';
import { LavaOrb } from './orb/lava-orb.js';
import { getPalette, getBadgeColor } from './core/palettes.js';
import { tempParams } from './core/temp-params.js';

// Install effect mixins on LavaOrb prototype
import { installFireDoom } from './orb/fire-doom.js';
import { installFireParticles } from './orb/fire-particles.js';
import { installFrost } from './orb/frost.js';
import { installParticles } from './orb/particles.js';
import { installDetach } from './fx/detach.js';
import { installExplosion } from './fx/explosion.js';
installFireDoom(LavaOrb);
installFireParticles(LavaOrb);
installFrost(LavaOrb);
installParticles(LavaOrb);
installDetach(LavaOrb, OrbGroup);
installExplosion(OrbGroup);

const LavaOrbAPI = {
  attach,
  createGroup,
  getByInput,
  LavaOrb,
  OrbGroup,
  getPalette,
  getBadgeColor,
  tempParams,
  VERSION: '0.1.0'
};

// In browser — attach to window for IIFE compatibility
if (typeof window !== 'undefined') {
  window.LavaOrb = LavaOrbAPI;
}

export default LavaOrbAPI;
export { attach, createGroup, getByInput, LavaOrb, OrbGroup, getPalette, getBadgeColor, tempParams };
