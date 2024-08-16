// HSL space (hue, saturation, lightness within sRGB gamut)

// Reference:
// https://github.com/color-js/color.js/blob/cfe55d358adb6c2e23c8a897282adf42904fd32d/src/spaces/hsl.js

import { sRGB, sRGBLinear } from "../../src/index.js";

export const HSL = {
  id: "hsl",
  // Note: @texel/color currently only supports 1-level depth for color spaces
  // (for performance & memory reasons) - so our base must be one without another base space
  base: sRGBLinear,
  // Adapted from https://drafts.csswg.org/css-color-4/better-rgbToHsl.js
  fromBase: (rgb, out = [0, 0, 0]) => {
    // from sRGBLinear (this space's base) to sRGB (for HSL conversion)
    sRGB.fromBase(rgb, out);
    const r = out[0];
    const g = out[1];
    const b = out[2];
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h = 0,
      s = 0,
      l = (min + max) / 2;
    let d = max - min;

    if (d !== 0) {
      s = l === 0 || l === 1 ? 0 : (max - l) / Math.min(l, 1 - l);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
      }

      h = h * 60;
    }

    // Very out of gamut colors can produce negative saturation
    // If so, just rotate the hue by 180 and use a positive saturation
    // see https://github.com/w3c/csswg-drafts/issues/9222
    if (s < 0) {
      h += 180;
      s = Math.abs(s);
    }

    if (h >= 360) {
      h -= 360;
    }

    out[0] = h;
    out[1] = s * 100;
    out[2] = l * 100;
    return out;
  },
  // Adapted from https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative
  toBase: (hsl, out = [0, 0, 0]) => {
    let h = hsl[0];
    let s = hsl[1];
    let l = hsl[2];
    h = h % 360;
    if (h < 0) {
      h += 360;
    }

    s /= 100;
    l /= 100;

    const a = s * Math.min(l, 1 - l);
    out[0] = f(h, l, a, 0);
    out[1] = f(h, l, a, 8);
    out[2] = f(h, l, a, 4);
    // from sRGB to sRGBLinear (this space's base)
    sRGB.toBase(out, out);
    return out;
  },
};

function f(h, l, a, n) {
  let k = (n + h / 30) % 12;
  return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
}
