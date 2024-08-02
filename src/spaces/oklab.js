// Oklab and related spaces: OKLCH, OKHSV(sRGB), OKHSL(sRGB)

import { constrainAngle, vec3 } from "../util.js";
import {
  OKHSLToOKLab,
  OKHSVToOKLab,
  OKLabToOKHSL,
  OKLabToOKHSV,
} from "../okhsl.js";

import { sRGBGamut } from "./srgb.js";

// based on colorjs.io, could perhaps use a more specific number than this
const ACHROMATIC_EPSILON = (0.4 - 0.0) / 100000;

export const OKLab = {
  id: "oklab",
};

export const OKLCH = {
  id: "oklch",
  base: OKLab,
  toBase: (oklch, out = vec3()) => {
    // Note: newer version of Colorjs.io clamps oklch chroma
    // However, this means that oklch(0.5, -0.36, 90) -> srgb will result in an in-gamut rgb
    // which seems a bit odd; you'd expect it to be out of gamut. So we will leave
    // chroma unclamped for this conversion.
    // const C = Math.max(0, oklch[1]);

    const C = oklch[1];
    const H = oklch[2];
    out[0] = oklch[0]; // L remains the same
    out[1] = C * Math.cos((H * Math.PI) / 180); // a
    out[2] = C * Math.sin((H * Math.PI) / 180); // b
    return out;
  },
  fromBase: (oklab, out = vec3()) => {
    // These methods are used for other polar forms as well, so we can't hardcode the ε
    const a = oklab[1];
    const b = oklab[2];
    let isAchromatic =
      Math.abs(a) < ACHROMATIC_EPSILON && Math.abs(b) < ACHROMATIC_EPSILON;
    let hue = isAchromatic
      ? 0
      : constrainAngle((Math.atan2(b, a) * 180) / Math.PI);
    let C = isAchromatic ? 0 : Math.sqrt(a * a + b * b);
    out[0] = oklab[0]; // L remains the same
    out[1] = C; // Chroma
    out[2] = hue; // Hue, in degrees [0 to 360)
    return out;
  },
};

export const OKHSL = {
  // Note: sRGB gamut only
  // For other gamuts, use okhsl method directly
  id: "okhsl",
  base: OKLab,
  toBase: (okhsl, out = vec3()) => OKHSLToOKLab(okhsl, sRGBGamut, out),
  fromBase: (oklab, out = vec3()) => OKLabToOKHSL(oklab, sRGBGamut, out),
};

export const OKHSV = {
  // Note: sRGB gamut only
  // For other gamuts, use okhsv method directly
  id: "okhsv",
  base: OKLab,
  toBase: (okhsl, out = vec3()) => OKHSVToOKLab(okhsl, sRGBGamut, out),
  fromBase: (oklab, out = vec3()) => OKLabToOKHSV(oklab, sRGBGamut, out),
};
