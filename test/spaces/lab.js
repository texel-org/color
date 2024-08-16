// Lab aka CIELAB aka L*a*b* (uses a D50 WHITE_D50 point and has to be adapted)
// refer to CSS Color Module Level 4 Spec for more details

// Reference:
// https://github.com/color-js/color.js/blob/cfe55d358adb6c2e23c8a897282adf42904fd32d/src/spaces/lab.js
import { D50_to_D65_M, D65_to_D50_M } from "../../src/index.js";

// K * e  = 2^3 = 8
const e = 216 / 24389; // 6^3/29^3 == (24/116)^3
const e3 = 24 / 116;
const K = 24389 / 27; // 29^3/3^3
const WHITE_D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];

const fterm = (value) =>
  value > e ? Math.cbrt(value) : (K * value + 16) / 116;

const inv = (value) =>
  value > e3 ? Math.pow(value, 3) : (116 * value - 16) / K;

export const Lab = {
  id: "lab",
  adapt: {
    // chromatic adaptation to and from D65
    to: D50_to_D65_M,
    from: D65_to_D50_M,
  },
  // Convert D50-adapted XYX to Lab
  // CIE 15.3:2004 section 8.2.1.1
  fromXYZ(xyz, out = [0, 0, 0]) {
    // XYZ scaled relative to reference WHITE_D50, then modified
    out[0] = fterm(xyz[0] / WHITE_D50[0]);
    out[1] = fterm(xyz[1] / WHITE_D50[1]);
    out[2] = fterm(xyz[2] / WHITE_D50[2]);
    let L = 116 * out[1] - 16;
    let a = 500 * (out[0] - out[1]);
    let b = 200 * (out[1] - out[2]);
    out[0] = L;
    out[1] = a;
    out[2] = b;
    return out;
  },
  // Convert Lab to D50-adapted XYZ
  // Same result as CIE 15.3:2004 Appendix D although the derivation is different
  // http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
  toXYZ(Lab, out = [0, 0, 0]) {
    // compute f, starting with the luminance-related term
    const L = Lab[0];
    const a = Lab[1];
    const b = Lab[2];
    out[1] = (L + 16) / 116;
    out[0] = a / 500 + out[1];
    out[2] = out[1] - b / 200;

    // compute xyz and scale by WHITE_D50
    out[0] = inv(out[0]) * WHITE_D50[0];
    out[1] = (L > 8 ? Math.pow((L + 16) / 116, 3) : L / K) * WHITE_D50[1];
    out[2] = inv(out[2]) * WHITE_D50[2];
    return out;
  },
};
