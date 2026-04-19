// tempParams(val) — liquid/fire/frost parameters for each value 1-10.
// Pure mapping function with no dependencies.

/**
 * @typedef {Object} TempParams
 * @property {number}  fill          — liquid fill ratio (0-1)
 * @property {number}  amp           — wave amplitude
 * @property {number}  speed         — animation speed multiplier
 * @property {number}  embers        — ember particle count inside orb
 * @property {boolean} frost         — frost mode (val 1-2)
 * @property {boolean} fire          — fire mode (val 7-10)
 * @property {number}  fireIntensity — fire intensity 0-1 (smooth gradient)
 * @property {number}  bubble        — bubble intensity 0-1
 */

/**
 * Return TempParams for the given value (1-10).
 * @param {number} val
 * @returns {TempParams}
 */
export function tempParams(val) {
  // fireIntensity 0-1 — smooth gradient for fire starting at val 7.
  // Avoids the abrupt on/off transition between val 8 and val 9.
  if (val <= 1) return { fill: 0.45, amp: 0,   speed: 0,   embers: 0,  frost: true,  fire: false, fireIntensity: 0,    bubble: 0 };
  if (val <= 2) return { fill: 0.40, amp: 0.8, speed: 0.3, embers: 0,  frost: true,  fire: false, fireIntensity: 0,    bubble: 0 };
  if (val <= 3) return { fill: 0.42, amp: 1.2, speed: 0.5, embers: 0,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.1 };
  if (val <= 4) return { fill: 0.44, amp: 1.8, speed: 0.7, embers: 1,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.2 };
  if (val <= 5) return { fill: 0.48, amp: 2.5, speed: 1.0, embers: 3,  frost: false, fire: false, fireIntensity: 0,    bubble: 0.3 };
  if (val <= 6) return { fill: 0.50, amp: 3.0, speed: 1.2, embers: 4,  frost: false, fire: false, fireIntensity: 0.05, bubble: 0.4 };
  if (val <= 7) return { fill: 0.54, amp: 3.5, speed: 1.5, embers: 5,  frost: false, fire: true,  fireIntensity: 0.25, bubble: 0.6 };
  if (val <= 8) return { fill: 0.58, amp: 4.2, speed: 1.8, embers: 6,  frost: false, fire: true,  fireIntensity: 0.50, bubble: 0.8 };
  if (val <= 9) return { fill: 0.65, amp: 5.0, speed: 2.3, embers: 8,  frost: false, fire: true,  fireIntensity: 0.75, bubble: 0.9 };
  return              { fill: 0.78, amp: 6.5, speed: 3.0, embers: 12, frost: false, fire: true,  fireIntensity: 1.0,  bubble: 1.0 };
}
