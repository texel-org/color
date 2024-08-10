import * as Colors from "../src/index.js";
import { OKLCH, sRGB } from "colorjs.io/fn";

// get N OKLCH pixels by sampling OKLab, many will be out of srgb gamut
const N = 512 * 512;
const oklchPixelsRandom = Array(N)
  .fill()
  .map((_, i, lst) => {
    const t = i / (lst.length - 1);
    return Colors.convert(
      [t, t * 2 - 1, t * 2 - 1],
      Colors.OKLab,
      Colors.OKLCH
    );
  });

let now, elapsedColorjs, elapsedOurs;

now = performance.now();
for (let vec of oklchPixelsRandom) {
  sRGB.from(OKLCH, vec);
}
elapsedColorjs = performance.now() - now;

now = performance.now();
let tmp = [0, 0, 0];
for (let vec of oklchPixelsRandom) {
  Colors.convert(tmp, Colors.OKLCH, Colors.sRGB, tmp);
}
elapsedOurs = performance.now() - now;

print("OKLCH to sRGB conversion");

function print(label) {
  console.log("%s --", label);
  console.log("Colorjs: %s ms", elapsedColorjs.toFixed(2));
  console.log("Ours: %s ms", elapsedOurs.toFixed(2));
  if (elapsedColorjs > elapsedOurs)
    console.log(
      "Speedup: %sx faster",
      (elapsedColorjs / elapsedOurs).toFixed(1)
    );
  else
    console.log(
      "Slowdown: %sx slower",
      (elapsedOurs / elapsedColorjs).toFixed(1)
    );
  console.log();
}
