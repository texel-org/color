// When gamut mapping with OKLCH approximation,
// the resulting points do not always lie exactly in gamut.
// The same may be true of OKHSL to RGB spaces.
// Let's figure out how far away they are:
// if a given point is under this threshold, gamut mapping
// will be redundant as it will just produce the same epsilon.
// This value is used in gamut.js as the RGB_CLIP_EPSILON

import {
  clampedRGB,
  convert,
  degToRad,
  findCuspOKLCH,
  findGamutIntersectionOKLCH,
  isRGBInGamut,
  lerp,
  MapToCuspL,
  OKLCH,
  sRGBGamut,
  sRGBLinear,
} from "../src/index.js";

const gamut = sRGBGamut;
const target = gamut.space.base; // linear form

// slice the plane into a square
const slices = 100;
let avgDelta = 0;
let avgCount = 0;
let minDelta = Infinity;
let maxDelta = -Infinity;

// a very small number which still catches many gamut-mapped points
// but produces very little difference in practical and visual results
const RGB_CLIP_EPSILON = 0.0000001;
let totalPointsOutOfGamut = 0;
let totalPointsUnderEpsilon = 0;

// this particular hue is a little funky
// https://github.com/color-js/color.js/issues/81
// it produces out of gamut sRGB, however, the oklab gamut approximation seems to handle it fine
const hue = 264.1;
const lightness = 0.4;
for (let chroma = 0.22; chroma < 0.285; chroma += 0.001) {
  const oklch = [lightness, chroma, hue];
  const rgb = convert(oklch, OKLCH, sRGBLinear);
  if (!isRGBInGamut(rgb, 0)) {
    const mappedOKLCH = gamutMapWithoutClipOKLCH(oklch);
    const mappedRGB = convert(mappedOKLCH, OKLCH, sRGBLinear);
    const delta = clipDelta(mappedRGB);
    if (!delta.every((n) => n == 0)) console.log("hue", hue, "delta", delta);
    // console.log("delta after fast map:", delta);
  }
}

// test all hue planes 0.5º difference apart
// we will see some gamut mapped points still do not lie exactly in gamut
for (let H = 0; H < 360; H += 0.5) {
  for (let y = 0; y < slices; y++) {
    for (let x = 0; x < slices; x++) {
      const u = x / (slices - 1);
      const v = y / (slices - 1);
      const L = 1 - v;
      const C = u * 0.4;

      // try conversion
      let rgbl = convert([L, C, H], OKLCH, target);

      // not exactly in space
      if (!isRGBInGamut(rgbl, 0)) {
        const oklch = gamutMapWithoutClipOKLCH([L, C, H]);
        rgbl = convert(oklch, OKLCH, target);

        const [dr, dg, db] = clipDelta(rgbl);
        const avg = (dr + dg + db) / 3;
        const min = Math.min(dr, dg, db);
        const max = Math.max(dr, dg, db);
        avgDelta += avg;
        avgCount++;
        minDelta = Math.min(min, minDelta);
        maxDelta = Math.max(max, maxDelta);

        totalPointsOutOfGamut++;
        if (isRGBInGamut(rgbl, RGB_CLIP_EPSILON)) {
          totalPointsUnderEpsilon++;
        }
      }
    }
  }
}

function clipDelta(rgb) {
  const clipped = clampedRGB(rgb);
  const dr = Math.abs(rgb[0] - clipped[0]);
  const dg = Math.abs(rgb[1] - clipped[1]);
  const db = Math.abs(rgb[2] - clipped[2]);
  return [dr, dg, db];
}

function gamutMapWithoutClipOKLCH(oklch) {
  const [L, C, H] = oklch;
  // we aren't in gamut, so let's map toward it
  const hueAngle = degToRad(H);
  const aNorm = Math.cos(hueAngle);
  const bNorm = Math.sin(hueAngle);

  const out = [L, C, H];
  // choose our strategy
  const cusp = findCuspOKLCH(aNorm, bNorm, gamut);
  const LTarget = MapToCuspL(out, cusp);

  let t = findGamutIntersectionOKLCH(aNorm, bNorm, L, C, LTarget, cusp, gamut);
  out[0] = lerp(LTarget, L, t);
  out[1] *= t;
  return out;
}

avgDelta /= avgCount;

console.log("Min Epsilon:", minDelta);
console.log("Max Epsilon:", maxDelta);
console.log("Average Epsilon:", avgDelta);
console.log("Compare against epsilon:", RGB_CLIP_EPSILON);
console.log("Total points out of gamut:", totalPointsOutOfGamut);
console.log("Total points under epsilon:", totalPointsUnderEpsilon);
