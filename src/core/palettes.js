// Palettes — color schemes for 10 temperature states + DOOM fire.

// Light theme — cool blue (cold) → fiery red (hot). Each entry: [fill-top, fill-mid, dark, border]
export const SLIDER_PALETTE_LIGHT = [
  null,
  ['#6494ED', '#8AB4FF', '#2A4480', '#4A74CD'],
  ['#5A9DE6', '#7CB8F0', '#1A5090', '#3A7DC6'],
  ['#4FB8D0', '#6FD8E8', '#1A6878', '#3098B0'],
  ['#45C4AA', '#65E4CA', '#0A6050', '#25A48A'],
  ['#4ABA7A', '#6ADA9A', '#0A5A30', '#2A9A5A'],
  ['#7AB648', '#9AD668', '#3A5610', '#5A9628'],
  ['#B5A234', '#D5C254', '#5A4A08', '#958214'],
  ['#E09028', '#FFB848', '#6A3000', '#C07010'],
  ['#E8703A', '#FF9060', '#6A2008', '#C8501A'],
  ['#E05A5A', '#FF7A7A', '#6A1010', '#C03A3A']
];

// Dark theme — more saturated shades for contrast on dark backgrounds
export const SLIDER_PALETTE_DARK = [
  null,
  ['#7BAAF0', '#A0C8FF', '#2A4490', '#5B8AD0'],
  ['#6DB5E8', '#90D0FF', '#1A5898', '#4D95C8'],
  ['#5CC8D8', '#80E0F0', '#1A7080', '#3CA8B8'],
  ['#50D4B5', '#78F0D8', '#106850', '#30B495'],
  ['#56CC88', '#78ECA8', '#106838', '#36AC68'],
  ['#88C856', '#A8E876', '#406018', '#68A836'],
  ['#C4B240', '#E8D860', '#5A4A08', '#A49220'],
  ['#ECA040', '#FFC060', '#704000', '#CC8020'],
  ['#F08050', '#FFA070', '#702810', '#D06030'],
  ['#F06868', '#FF9090', '#701818', '#D04848']
];

// DOOM fire palette — 37 colors of cellular automaton (black → red → orange → yellow → white)
export const FIRE_PALETTE = [
  [  7,  7,  7], [ 31,  7,  7], [ 47, 15,  7], [ 71, 15,  7],
  [ 87, 23,  7], [103, 31,  7], [119, 31,  7], [143, 39,  7],
  [159, 47,  7], [175, 63,  7], [191, 71,  7], [199, 71,  7],
  [223, 79,  7], [223, 87,  7], [223, 87,  7], [215, 95,  7],
  [215, 103, 15], [207, 111, 15], [207, 119, 15], [207, 127, 15],
  [207, 135, 23], [199, 135, 23], [199, 143, 23], [199, 151, 31],
  [191, 159, 31], [191, 159, 31], [191, 167, 39], [191, 167, 39],
  [191, 175, 47], [183, 175, 47], [183, 183, 47], [183, 183, 55],
  [200, 180, 70], [210, 190, 85], [215, 200, 100], [220, 205, 120],
  [228, 210, 140]
];

// Frost palette — 24 colors (black → blue → icy → white)
export const FROST_PALETTE = [
  [  5,  5, 15], [  8, 12, 30], [ 12, 20, 50], [ 15, 30, 70],
  [ 20, 40, 90], [ 25, 55, 115], [ 30, 70, 140], [ 40, 85, 160],
  [ 50, 100, 180], [ 60, 115, 195], [ 75, 130, 210], [ 90, 150, 220],
  [110, 170, 230], [130, 185, 235], [150, 200, 240], [170, 210, 245],
  [185, 220, 248], [200, 230, 250], [210, 235, 252], [220, 240, 253],
  [230, 245, 254], [240, 250, 255], [248, 253, 255], [255, 255, 255]
];

/**
 * Get 4-color palette for val (1-10) with theme awareness.
 * @param {number} val — slider value 1-10
 * @param {boolean} isDark — dark theme flag
 * @returns {string[]} array of 4 hex color strings
 */
export function getPalette(val, isDark) {
  const pal = isDark ? SLIDER_PALETTE_DARK : SLIDER_PALETTE_LIGHT;
  const clamped = Math.max(1, Math.min(10, Math.round(val)));
  return pal[clamped] || pal[5];
}

/**
 * Primary badge color for val (first color in palette).
 */
export function getBadgeColor(val, isDark) {
  return getPalette(val, isDark)[0];
}
