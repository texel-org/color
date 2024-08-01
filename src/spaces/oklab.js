// Oklab and related spaces: OKLCH, OKHSV(sRGB), OKHSL(sRGB)

import { vec3 } from "../util.js";
import {
  okhslToOklab,
  okhsvToOklab,
  oklabToOkhsl,
  oklabToOkhsv,
} from "../okhsl.js";
import { sRGBGamut } from "./srgb.js";

export const OKLab = {
  id: "oklab",
};

export const OKLCH = {
  id: "oklch",
  base: OKLab,
  toBase: (OKLCH, out = vec3()) => {
    // Note: newer version of Colorjs.io clamps OKLCH chroma
    // However, this means that oklch(0.5, -0.36, 90) -> srgb will result in an in-gamut rgb
    // which seems a bit odd; you'd expect it to be out of gamut. So we will leave
    // chroma unclamped for this conversion.
    // const C = Math.max(0, OKLCH[1]);

    const C = OKLCH[1];
    const H = OKLCH[2];
    out[0] = OKLCH[0]; // L remains the same
    out[1] = C * Math.cos((H * Math.PI) / 180); // a
    out[2] = C * Math.sin((H * Math.PI) / 180); // b
    return out;
  },
  fromBase: (OKLab, out = vec3()) => {
    const a = OKLab[1];
    const b = OKLab[2];
    const epsilon = 1e-8; // should figure out a good number for this
    let isAchromatic = Math.abs(a) < epsilon && Math.abs(b) < epsilon;
    let hue = isAchromatic ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
    let C = isAchromatic ? 0 : Math.sqrt(a * a + b * b);
    out[0] = OKLab[0]; // L remains the same
    out[1] = C; // Chroma
    out[2] = hue >= 0 ? hue : hue + 360; // Hue, in degrees [0 to 360)
    return out;
  },
};

export const OKHSL = {
  // Note: sRGB gamut only
  // For other gamuts, use okhsl method directly
  id: "okhsl",
  base: OKLab,
  toBase: (okhsl, out = vec3()) => okhslToOklab(okhsl, sRGBGamut, out),
  fromBase: (OKLab, out = vec3()) => oklabToOkhsl(OKLab, sRGBGamut, out),
};

export const OKHSV = {
  // Note: sRGB gamut only
  // For other gamuts, use okhsv method directly
  id: "okhsv",
  base: OKLab,
  toBase: (okhsl, out = vec3()) => okhsvToOklab(okhsl, sRGBGamut, out),
  fromBase: (OKLab, out = vec3()) => oklabToOkhsv(OKLab, sRGBGamut, out),
};
