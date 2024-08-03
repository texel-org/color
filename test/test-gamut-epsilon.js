// When gamut mapping with OKLCH approximation,
// the resulting points do not always lie exactly in gamut.
// The same may be true of OKHSL to RGB spaces.
// Let's figure out how far away they are:
// if a given point is under this threshold, gamut mapping
// will be redundant as it will just produce the same epsilon.
// This value is used in gamut.js as the RGB_CLIP_EPSILON

import {
  A98RGBGamut,
  clampedRGB,
  convert,
  degToRad,
  DisplayP3Gamut,
  findCuspOKLCH,
  findGamutIntersectionOKLCH,
  gamutMapOKLCH,
  isRGBInGamut,
  lerp,
  MapToCuspL,
  OKLCH,
  Rec2020Gamut,
  sRGBGamut,
} from "../src/index.js";

const huePlanes = Array(360)
  .fill()
  .map((_, i) => i);
const gamut = sRGBGamut;
const target = gamut.space.base; // linear form

// slice the plane into a square
const slices = 100;
let avgDelta = 0;
let avgCount = 0;
let minDelta = Infinity;
let maxDelta = -Infinity;

const EPSILON = 0.000074;
let totalPointsOutOfGamut = 0;
let totalPointsUnderEpsilon = 0;

for (let H = 0; H < 360; H += 0.5) {
  for (let y = 0; y < slices; y++) {
    for (let x = 0; x < slices; x++) {
      const u = x / (slices - 1);
      const v = y / (slices - 1);
      const L = 1 - v;
      const C = u * 0.4;

      // try conversion
      const rgbl = convert([L, C, H], OKLCH, target);

      // not exactly in space
      if (!isRGBInGamut(rgbl, 0)) {
        // we aren't in gamut, so let's map toward it
        const hueAngle = degToRad(H);
        const aNorm = Math.cos(hueAngle);
        const bNorm = Math.sin(hueAngle);

        const out = [L, C, H];
        // choose our strategy
        const cusp = findCuspOKLCH(aNorm, bNorm, gamut);
        const LTarget = MapToCuspL(out, cusp);

        let t = findGamutIntersectionOKLCH(
          aNorm,
          bNorm,
          L,
          C,
          LTarget,
          cusp,
          gamut
        );
        out[0] = lerp(LTarget, L, t);
        out[1] *= t;

        // convert again to rgb linear
        const rgbl = convert(out, OKLCH, target);
        const clipped = clampedRGB(rgbl);
        const dr = Math.abs(rgbl[0] - clipped[0]);
        const dg = Math.abs(rgbl[1] - clipped[1]);
        const db = Math.abs(rgbl[2] - clipped[2]);
        const avg = (dr + dg + db) / 3;
        const min = Math.min(dr, dg, db);
        const max = Math.max(dr, dg, db);
        avgDelta += avg;
        avgCount++;
        minDelta = Math.min(min, minDelta);
        maxDelta = Math.max(max, maxDelta);

        totalPointsOutOfGamut++;
        if (isRGBInGamut(rgbl, EPSILON)) {
          totalPointsUnderEpsilon++;
        }
      }
    }
  }
}
avgDelta /= avgCount;

console.log("Min Epsilon:", minDelta);
console.log("Max Epsilon:", maxDelta);
console.log("Average Epsilon:", avgDelta);
console.log("Compare against epsilon:", EPSILON);
console.log("Total points out of gamut:", totalPointsOutOfGamut);
console.log("Total points under epsilon:", totalPointsUnderEpsilon);
