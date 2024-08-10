import {
  ColorSpace,
  toGamut,
  XYZ_D65 as XYZ_D65_COLORJS,
  XYZ_D50 as XYZ_D50_COLORJS,
  OKLab as OkLab_COLORJS,
  OKLCH as OKLCH_COLORJS,
  // Okhsv as Okhsv_COLORJS,
  // Okhsl as Okhsl_COLORJS,
  sRGB as SRGB_COLORJS,
  sRGB_Linear as SRGB_Linear_COLORJS,
  P3 as P3_COLORJS,
  P3_Linear as P3_Linear_COLORJS,
  REC_2020 as REC_2020_COLORJS,
  REC_2020_Linear as REC_2020_Linear_COLORJS,
  A98RGB as A98RGB_COLORJS,
  A98RGB_Linear as A98RGB_Linear_COLORJS,
  ProPhoto as ProPhoto_COLORJS,
  ProPhoto_Linear as ProPhoto_Linear_COLORJS,
 } from "colorjs.io/fn";

import {
  convert,
  OKLCH,
  sRGB,
  sRGBGamut,
  listColorSpaces,
  DisplayP3Gamut,
  DisplayP3,
  gamutMapOKLCH,
  constrainAngle,
  findCuspOKLCH,
  degToRad,
  MapToCuspL,
} from "../src/index.js";

ColorSpace.register(XYZ_D65_COLORJS);
ColorSpace.register(XYZ_D50_COLORJS);
ColorSpace.register(OkLab_COLORJS);
ColorSpace.register(OKLCH_COLORJS);
// ColorSpace.register(Okhsv_COLORJS);
// ColorSpace.register(Okhsl_COLORJS);
ColorSpace.register(SRGB_COLORJS);
ColorSpace.register(SRGB_Linear_COLORJS);
ColorSpace.register(P3_COLORJS);
ColorSpace.register(P3_Linear_COLORJS);
ColorSpace.register(REC_2020_COLORJS);
ColorSpace.register(REC_2020_Linear_COLORJS);
ColorSpace.register(A98RGB_COLORJS);
ColorSpace.register(A98RGB_Linear_COLORJS);
ColorSpace.register(ProPhoto_COLORJS);
ColorSpace.register(ProPhoto_Linear_COLORJS);

const fixName = (name) => {
  return name
    .replace("display-", "")
    .replace("a98-rgb", "a98rgb")
    .replace("prophoto-rgb", "prophoto");
};

// TODO: test okhsl with latest version of colorjs
const spaces = listColorSpaces().filter((f) => !/ok(hsv|hsl)/i.test(f.id));
const spacesForColorjs = spaces.map((s) => ColorSpace.get(fixName(s.id)));

const vecs = Array(128 * 128)
  .fill()
  .map((_, i, lst) => {
    const t = i / (lst.length - 1);
    return (
      Array(3)
        .fill()
        // -0.5 .. 1.5
        .map(() => t + (t * 2 - 1) * 0.5)
    );
  });

const tmp = [0, 0, 0];

let now, elapsedColorjs, elapsedOurs;

//// OKLCH to sRGB with gamut mapping (direct path)

const hueCusps = Array(360).fill(null);
const oklchVecs = Array(512 * 256)
  .fill()
  .map((_, i, lst) => {
    const t0 = i / (lst.length - 1);
    const t1 = i / lst.length;
    const H = constrainAngle(Math.round(t1 * 360));
    if (!hueCusps[H]) {
      const Hr = degToRad(H);
      const a = Math.cos(Hr);
      const b = Math.sin(Hr);
      hueCusps[H] = findCuspOKLCH(a, b, sRGBGamut);
    }
    return [t0, t0, H];
  });

now = performance.now();
let tmpColorjs = {space: SRGB_COLORJS, coords: [0, 0, 0], alpha: 1};
for (let vec of oklchVecs) {
  tmpColorjs.coords = SRGB_COLORJS.from(OKLCH_COLORJS, vec);
  // toGamut modifies the color in place
  // the default gamut mapping method is css
  toGamut(tmpColorjs);
}
elapsedColorjs = performance.now() - now;

now = performance.now();
for (let vec of oklchVecs) {
  // you can omit the cusp and it will be found on the fly
  // however the test will run slightly slower (e.g. ~100x faster rather than ~120x)
  const cusp = hueCusps[vec[2]];
  gamutMapOKLCH(vec, sRGBGamut, sRGB, tmp, MapToCuspL, cusp);
}
elapsedOurs = performance.now() - now;

console.log("OKLCH to sRGB with gamut mapping --");
console.log("Colorjs: %s ms", elapsedColorjs.toFixed(2));
console.log("Ours: %s ms", elapsedOurs.toFixed(2));
console.log("Speedup: %sx faster", (elapsedColorjs / elapsedOurs).toFixed(1));

//// conversions

now = performance.now();
for (let vec of vecs) {
  for (let i = 0; i < spacesForColorjs.length; i++) {
    for (let j = 0; j < spacesForColorjs.length; j++) {
      const a = spacesForColorjs[i];
      const b = spacesForColorjs[j];
      tmpColorjs = a.to(b, vec);
    }
  }
}
elapsedColorjs = performance.now() - now;

now = performance.now();
for (let vec of vecs) {
  for (let i = 0; i < spaces.length; i++) {
    for (let j = 0; j < spaces.length; j++) {
      const a = spaces[i];
      const b = spaces[j];
      convert(vec, a, b, tmp);
    }
  }
}
elapsedOurs = performance.now() - now;
console.log();
console.log("All Conversions --");
console.log("Colorjs: %s ms", elapsedColorjs.toFixed(2));
console.log("Ours: %s ms", elapsedOurs.toFixed(2));
console.log("Speedup: %sx faster", (elapsedColorjs / elapsedOurs).toFixed(1));

//// gamut mapping

now = performance.now();
tmpColorjs = {space: P3_COLORJS, coords: [0, 0, 0], alpha: 1 }
for (let vec of vecs) {
  for (let i = 0; i < spacesForColorjs.length; i++) {
    const a = spacesForColorjs[i];
    tmpColorjs.coords = P3_COLORJS.from(a, vec);
    toGamut(tmpColorjs);
  }
}
elapsedColorjs = performance.now() - now;

now = performance.now();
for (let vec of vecs) {
  for (let i = 0; i < spaces.length; i++) {
    const a = spaces[i];
    convert(vec, a, OKLCH, tmp);
    gamutMapOKLCH(tmp, DisplayP3Gamut, DisplayP3, tmp);
  }
}
elapsedOurs = performance.now() - now;

console.log();
console.log("Conversion + Gamut Mapping --");
console.log("Colorjs: %s ms", elapsedColorjs.toFixed(2));
console.log("Ours: %s ms", elapsedOurs.toFixed(2));
console.log("Speedup: %sx faster", (elapsedColorjs / elapsedOurs).toFixed(1));
