import Color from "colorjs.io";
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

const fixName = (name) => {
  return name
    .replace("display-", "")
    .replace("a98-rgb", "a98rgb")
    .replace("prophoto-rgb", "prophoto");
};

// TODO: test okhsl with latest version of colorjs
const spaces = listColorSpaces().filter((f) => !/ok(hsv|hsl)/i.test(f.id));
const spacesForColorjs = spaces.map((s) => fixName(s.id));

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
for (let vec of oklchVecs) {
  new Color("oklch", vec).to("srgb").toGamut({ space: "srgb", method: "css" });
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
      new Color(a, vec).to(b);
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
for (let vec of vecs) {
  for (let i = 0; i < spacesForColorjs.length; i++) {
    const a = spacesForColorjs[i];
    new Color(a, vec).to("p3").toGamut({ space: "p3", method: "css" });
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
