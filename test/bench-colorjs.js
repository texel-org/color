import Color from "colorjs.io";
import {
  sRGB as sRGB_ColorJS,
  OKLCH as OKLCH_ColorJS,
  P3 as DisplayP3_ColorJS,
  toGamut,
} from "colorjs.io/fn";
import arrayAlmostEqual from "./almost-equal.js";
import {
  convert,
  OKLCH,
  OKLab,
  sRGB,
  sRGBGamut,
  DisplayP3Gamut,
  DisplayP3,
  gamutMapOKLCH,
  constrainAngle,
  findCuspOKLCH,
  degToRad,
  MapToCuspL,
} from "../src/index.js";

import { getSupportedColorJSSpaces } from "./colorjs-fn.js";

const supportedSpaces = getSupportedColorJSSpaces();

// @texel/color space interfaces
const spaces = supportedSpaces.map((s) => s.space);

// Colorjs.io space interfaces & IDs
const colorJSSpaces = supportedSpaces.map((s) => s.colorJSSpace);
const colorJSSpaceIDs = supportedSpaces.map((s) => s.colorJSSpace.id);

const N = 128 * 128;

// sampling variables within OKLab and converting to OKLCH
const vecs = Array(N)
  .fill()
  .map((_, i, lst) => {
    const t = i / (lst.length - 1);
    return convert([t, t * 2 - 1, t * 2 - 1], OKLab, OKLCH);
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

compare(
  "conversion (Colorjs.io procedural API)",
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < colorJSSpaces.length; i++) {
        for (let j = 0; j < colorJSSpaces.length; j++) {
          const a = colorJSSpaces[i];
          const b = colorJSSpaces[j];
          const ret = b.from(a, vec);
        }
      }
    }
  },
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < spaces.length; i++) {
        for (let j = 0; j < spaces.length; j++) {
          const a = spaces[i];
          const b = spaces[j];
          convert(vec, a, b, tmp);
        }
      }
    }
  }
);

compare(
  "conversion (Colorjs.io main API)",
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < colorJSSpaceIDs.length; i++) {
        for (let j = 0; j < colorJSSpaceIDs.length; j++) {
          const a = colorJSSpaceIDs[i];
          const b = colorJSSpaceIDs[j];
          new Color(a, vec).to(b);
        }
      }
    }
  },
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < spaces.length; i++) {
        for (let j = 0; j < spaces.length; j++) {
          const a = spaces[i];
          const b = spaces[j];
          convert(vec, a, b, tmp);
        }
      }
    }
  }
);

compare(
  "gamut mapping OKLCH - sRGB (Colorjs.io procedural API)",
  () => {
    let tmpColor = { space: sRGB_ColorJS, coords: [0, 0, 0], alpha: 1 };
    for (let vec of oklchVecs) {
      tmpColor.coords = sRGB_ColorJS.from(OKLCH_ColorJS, vec);
      toGamut(tmpColor);
    }
  },
  () => {
    for (let vec of oklchVecs) {
      // you can omit the cusp and it will be found on the fly,
      // however the test will run slightly slower
      const cusp = hueCusps[vec[2]];
      gamutMapOKLCH(vec, sRGBGamut, sRGB, tmp, MapToCuspL, cusp);
    }
  }
);

compare(
  "gamut mapping OKLCH - sRGB (Colorjs.io main API)",
  () => {
    for (let vec of oklchVecs) {
      new Color("oklch", vec)
        .to("srgb")
        .toGamut({ space: "srgb", method: "css" });
    }
  },
  () => {
    for (let vec of oklchVecs) {
      // you can omit the cusp and it will be found on the fly,
      // however the test will run slightly slower
      const cusp = hueCusps[vec[2]];
      gamutMapOKLCH(vec, sRGBGamut, sRGB, tmp, MapToCuspL, cusp);
    }
  }
);

compare(
  "gamut mapping all spaces to P3 (Colorjs.io procedural API)",
  () => {
    let tmpColor = { space: DisplayP3_ColorJS, coords: [0, 0, 0], alpha: 1 };
    for (let vec of vecs) {
      for (let i = 0; i < colorJSSpaces.length; i++) {
        const a = colorJSSpaces[i];
        tmpColor.coords = DisplayP3_ColorJS.from(a, vec);
        toGamut(tmpColor);
      }
    }
  },
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < spaces.length; i++) {
        const a = spaces[i];
        convert(vec, a, OKLCH, tmp);
        gamutMapOKLCH(tmp, DisplayP3Gamut, DisplayP3, tmp);
      }
    }
  }
);

compare(
  "gamut mapping all spaces to P3 (Colorjs.io main API)",
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < colorJSSpaceIDs.length; i++) {
        const a = colorJSSpaceIDs[i];
        new Color(a, vec).to("p3").toGamut({ space: "p3", method: "css" });
      }
    }
  },
  () => {
    for (let vec of vecs) {
      for (let i = 0; i < spaces.length; i++) {
        const a = spaces[i];
        convert(vec, a, OKLCH, tmp);
        gamutMapOKLCH(tmp, DisplayP3Gamut, DisplayP3, tmp);
      }
    }
  }
);

function print(label) {
  console.log("%s --", label);
  console.log("Colorjs.io: %s ms", elapsedColorjs.toFixed(2));
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

function compare(label, colorJSFn, ourFn) {
  now = performance.now();
  colorJSFn();
  elapsedColorjs = performance.now() - now;

  now = performance.now();
  ourFn();
  elapsedOurs = performance.now() - now;

  print(label);
}
