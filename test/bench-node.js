import {
  convert,
  OKLCH,
  sRGB,
  sRGBGamut,
  listColorSpaces,
  gamutMapOKLCH,
} from "../src/index.js";

const spaces = listColorSpaces().filter((f) => !/ok(hsv|hsl)/i.test(f.id));

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

// console.time("bench");

for (let vec of vecs) {
  for (let i = 0; i < spaces.length; i++) {
    for (let j = 0; j < spaces.length; j++) {
      const a = spaces[i];
      const b = spaces[j];

      // convert A to B
      convert(vec, a, b, tmp);
      // convert B to OKLCH
      convert(tmp, b, OKLCH, tmp);
      // gamut map OKLCH
      gamutMapOKLCH(tmp, sRGBGamut, sRGB, tmp);
    }
  }
}

// benchmark for EOK
// for (let i = 0; i < 1000; i++) {
//   for (let vec of vecs) {
//     deltaEOK(vec, [0, 0.25, 1]);
//   }
// }

// console.timeEnd("bench");
