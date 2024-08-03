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
  OKHSL,
  OKLab,
  OKHSLToOKLab,
} from "../src/index.js";

import { p3, toGamut, oklch, okhsl, converter } from "culori";

const N = 256 * 256;
const gamut = DisplayP3Gamut;
const target = gamut.space;

// get N OKLCH in-gamut pixels by sampling uniformly from OKHSL cube
const oklchPixelsInGamut = Array(N)
  .fill()
  .map((_, i, lst) => {
    const t = i / (lst.length - 1);
    // note if we use the standard OKHSL space, it is bound to sRGB gamut...
    // so instead we use the OKHSLToOKLab function and pass P3 gamut
    const okhsl = [t * 360, t, t];
    const oklab = OKHSLToOKLab(okhsl, gamut);
    return convert(oklab, OKLab, OKLCH);
  });

// get N OKLCH pixels by sampling OKLab, many will be out of srgb gamut
const oklchPixelsRandom = Array(N)
  .fill()
  .map((_, i, lst) => {
    const t = i / (lst.length - 1);
    return convert([t, t * 2 - 1, t * 2 - 1], OKLab, OKLCH);
  });

const toP3Gamut = toGamut("p3", "oklch");
// same perf as p3() it seems
// const p3Converter = converter("p3");

test(oklchPixelsInGamut, "Random Sampling in P3 Gamut");
test(oklchPixelsRandom, "Random Sampling in OKLab L Planes");
test(oklchPixelsRandom, "Random Sampling in OKLab L Planes", true);

function test(inputPixelsOKLCH, label, fixedCusp) {
  let cuspMap;
  if (fixedCusp) {
    cuspMap = new Array(360).fill(null);
    inputPixelsOKLCH = inputPixelsOKLCH.map((oklch) => {
      const H = constrainAngle(Math.round(oklch[2]));
      oklch = oklch.slice();
      oklch[2] = H;
      if (!cuspMap[H]) {
        const Hr = degToRad(H);
        const a = Math.cos(Hr);
        const b = Math.sin(Hr);
        cuspMap[H] = findCuspOKLCH(a, b, gamut);
      }
      return oklch;
    });
  }

  console.log(
    "Testing with input type: %s%s",
    label,
    fixedCusp ? " (Fixed Cusp)" : ""
  );
  const culoriInputsOKLCH = inputPixelsOKLCH.map(([l, c, h]) => {
    return {
      mode: "oklch",
      l,
      c,
      h,
    };
  });

  let now, elapsedCulori, elapsedOurs;
  let tmp = [0, 0, 0];

  //// conversion

  tmp = [0, 0, 0];
  now = performance.now();
  for (let oklch of inputPixelsOKLCH) {
    convert(oklch, OKLCH, target, tmp);
  }
  elapsedOurs = performance.now() - now;

  now = performance.now();
  for (let oklchColor of culoriInputsOKLCH) {
    p3(oklchColor);

    // same perf ?
    // p3Converter(oklchColor);
  }
  elapsedCulori = performance.now() - now;
  print("Conversion OKLCH to P3");

  //// gamut

  tmp = [0, 0, 0];
  if (fixedCusp && cuspMap) {
    now = performance.now();
    for (let oklch of inputPixelsOKLCH) {
      const cusp = cuspMap[oklch[2]];
      gamutMapOKLCH(oklch, gamut, target, tmp, undefined, cusp);
    }
    elapsedOurs = performance.now() - now;
  } else {
    now = performance.now();
    for (let oklch of inputPixelsOKLCH) {
      gamutMapOKLCH(oklch, gamut, target, tmp);
    }
    elapsedOurs = performance.now() - now;
  }

  now = performance.now();
  for (let oklchColor of culoriInputsOKLCH) {
    toP3Gamut(oklchColor);
  }
  elapsedCulori = performance.now() - now;
  print("Gamut Mapping OKLCH to P3 Gamut");

  function print(label) {
    console.log("%s --", label);
    console.log("Culori: %s ms", elapsedCulori.toFixed(2));
    console.log("Ours: %s ms", elapsedOurs.toFixed(2));
    if (elapsedCulori > elapsedOurs)
      console.log(
        "Speedup: %sx faster",
        (elapsedCulori / elapsedOurs).toFixed(1)
      );
    else
      console.log(
        "Slowdown: %sx slower",
        (elapsedOurs / elapsedCulori).toFixed(1)
      );
    console.log();
  }
}
