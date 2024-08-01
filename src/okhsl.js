import { vec3, constrainAngle as constrain } from "./util.js";
import { OKLab_to } from "./core.js";
import { sRGBGamut } from "./spaces.js";
import { findCusp, findGamutIntersection, getGamutLMStoRGB } from "./gamut.js";

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1.0 + K1) / (1.0 + K2);

const tmp2A = [0, 0];
const tmp2B = [0, 0];
const tmp3A = vec3();
const tmp2Cusp = [0, 0];

const tau = 2 * Math.PI;

const copySign = (to, from) => (Math.sign(to) === Math.sign(from) ? to : -to);

const spow = (base, exp) => copySign(Math.abs(base) ** exp, base);

const toe = (x) =>
  0.5 *
  (K3 * x - K1 + Math.sqrt((K3 * x - K1) * (K3 * x - K1) + 4 * K2 * K3 * x));

const toeInv = (x) => (x ** 2 + K1 * x) / (K3 * (x + K2));

const computeSt = (cusp, out) => {
  // To ST.
  let l = cusp[0];
  let c = cusp[1];
  out[0] = c / l;
  out[1] = c / (1 - l);
};

const toScaleL = (lv, cv, a_, b_, lmsToRgb) => {
  let lvt = toeInv(lv);
  let cvt = (cv * lvt) / lv;

  // RGB scale
  tmp3A[0] = lvt;
  tmp3A[1] = a_ * cvt;
  tmp3A[2] = b_ * cvt;
  let ret = OKLab_to(tmp3A, lmsToRgb, tmp3A);
  return spow(
    1.0 / Math.max(Math.max(ret[0], ret[1]), Math.max(ret[2], 0.0)),
    1 / 3
  );
};

const computeStMid = (a, b, out) => {
  // Returns a smooth approximation of the location of the cusp.
  //
  // This polynomial was created by an optimization process.
  // It has been designed so that S_mid < S_max and T_mid < T_max.

  let s =
    0.11516993 +
    1.0 /
      (7.4477897 +
        4.1590124 * b +
        a *
          (-2.19557347 +
            1.75198401 * b +
            a *
              (-2.13704948 -
                10.02301043 * b +
                a * (-4.24894561 + 5.38770819 * b + 4.69891013 * a))));

  let t =
    0.11239642 +
    1.0 /
      (1.6132032 -
        0.68124379 * b +
        a *
          (0.40370612 +
            0.90148123 * b +
            a *
              (-0.27087943 +
                0.6122399 * b +
                a * (0.00299215 - 0.45399568 * b - 0.14661872 * a))));

  out[0] = s;
  out[1] = t;
};

const getCs = (l, a, b, cusp, gamut) => {
  // Get Cs
  let cMax = findGamutIntersection(a, b, l, 1, l, cusp, gamut);
  let stMax = tmp2A;
  computeSt(cusp, stMax);

  // Scale factor to compensate for the curved part of gamut shape:
  let k = cMax / Math.min(l * stMax[0], (1 - l) * stMax[1]);

  const stMid = tmp2B;
  computeStMid(a, b, stMid);

  // Use a soft minimum function, instead of a sharp triangle shape to get a smooth value for chroma.
  let ca = l * stMid[0];
  let cb = (1.0 - l) * stMid[1];
  let cMid =
    0.9 * k * Math.sqrt(Math.sqrt(1.0 / (1.0 / ca ** 4 + 1.0 / cb ** 4)));

  // For `C_0`, the shape is independent of hue, so `ST` are constant.
  // Values picked to roughly be the average values of `ST`.
  ca = l * 0.4;
  cb = (1.0 - l) * 0.8;

  // Use a soft minimum function, instead of a sharp triangle shape to get a smooth value for chroma.
  let c0 = Math.sqrt(1.0 / (1.0 / ca ** 2 + 1.0 / cb ** 2));

  return [c0, cMid, cMax];
};

export const okhslToOklab = (hsl, gamut = sRGBGamut, out = vec3()) => {
  // Convert Okhsl to Oklab.
  let [h, s, l] = hsl;
  let L = toeInv(l);
  let a = 0;
  let b = 0;
  h = constrain(h) / 360.0;

  if (L !== 0.0 && L !== 1.0 && s !== 0) {
    let a_ = Math.cos(tau * h);
    let b_ = Math.sin(tau * h);

    const cusp = findCusp(a_, b_, gamut, tmp2Cusp);
    let [c0, cMid, cMax] = getCs(L, a_, b_, cusp, gamut);

    // Interpolate the three values for C so that:
    // ```
    // At s=0: dC/ds = C_0, C=0
    // At s=0.8: C=C_mid
    // At s=1.0: C=C_max
    // ```

    let mid = 0.8;
    let midInv = 1.25;
    let t, k0, k1, k2;

    if (s < mid) {
      t = midInv * s;
      k0 = 0.0;
      k1 = mid * c0;
      k2 = 1.0 - k1 / cMid;
    } else {
      t = 5 * (s - 0.8);
      k0 = cMid;
      k1 = (0.2 * cMid ** 2 * 1.25 ** 2) / c0;
      k2 = 1.0 - k1 / (cMax - cMid);
    }

    let c = k0 + (t * k1) / (1.0 - k2 * t);

    a = c * a_;
    b = c * b_;
  }

  out[0] = L;
  out[1] = a;
  out[2] = b;
  return out;
};

export const oklabToOkhsl = (lab, gamut = sRGBGamut, out = vec3()) => {
  // Oklab to Okhsl.

  // Epsilon for lightness should approach close to 32 bit lightness
  // Epsilon for saturation just needs to be sufficiently close when denoting achromatic
  let εL = 1e-7;
  let εS = 1e-4;
  let L = lab[0];

  let s = 0.0;
  let l = toe(L);

  let c = Math.sqrt(lab[1] ** 2 + lab[2] ** 2);
  let h = 0.5 + Math.atan2(-lab[2], -lab[1]) / tau;

  if (l !== 0.0 && l !== 1.0 && c !== 0) {
    let a_ = lab[1] / c;
    let b_ = lab[2] / c;

    const cusp = findCusp(a_, b_, gamut, tmp2Cusp);
    let [c0, cMid, cMax] = getCs(L, a_, b_, cusp, gamut);

    let mid = 0.8;
    let midInv = 1.25;
    let k0, k1, k2, t;

    if (c < cMid) {
      k1 = mid * c0;
      k2 = 1.0 - k1 / cMid;

      t = c / (k1 + k2 * c);
      s = t * mid;
    } else {
      k0 = cMid;
      k1 = (0.2 * cMid ** 2 * midInv ** 2) / c0;
      k2 = 1.0 - k1 / (cMax - cMid);

      t = (c - k0) / (k1 + k2 * (c - k0));
      s = mid + 0.2 * t;
    }
  }

  const achromatic = Math.abs(s) < εS;
  if (achromatic || l === 0.0 || Math.abs(1 - l) < εL) {
    // Due to floating point imprecision near lightness of 1, we can end up
    // with really high around white, this is to provide consistency as
    // saturation can be really high for white due this imprecision.
    if (!achromatic) {
      s = 0.0;
    }
  }

  h = constrain(h * 360);

  out[0] = h;
  out[1] = s;
  out[2] = l;
  return out;
};

export const okhsvToOklab = (hsv, gamut = sRGBGamut, out = vec3()) => {
  // Convert from Okhsv to Oklab."""

  let [h, s, v] = hsv;
  h = constrain(h) / 360.0;

  let l = toeInv(v);
  let a = 0;
  let b = 0;

  // Avoid processing gray or colors with undefined hues
  if (l !== 0.0 && s !== 0.0) {
    let a_ = Math.cos(tau * h);
    let b_ = Math.sin(tau * h);

    const lmsToRgb = getGamutLMStoRGB(gamut);
    const cusp = findCusp(a_, b_, gamut, tmp2Cusp);
    computeSt(cusp, tmp2A);
    const sMax = tmp2A[0];
    const tMax = tmp2A[1];
    let s0 = 0.5;
    let k = 1 - s0 / sMax;

    // first we compute L and V as if the gamut is a perfect triangle:

    // L, C when v==1:
    let lv = 1 - (s * s0) / (s0 + tMax - tMax * k * s);
    let cv = (s * tMax * s0) / (s0 + tMax - tMax * k * s);

    l = v * lv;
    let c = v * cv;

    // then we compensate for both toe and the curved top part of the triangle:
    const scaleL = toScaleL(lv, cv, a_, b_, lmsToRgb);

    let lNew = toeInv(l);
    c = (c * lNew) / l;
    l = lNew;

    l = l * scaleL;
    c = c * scaleL;

    a = c * a_;
    b = c * b_;
  }

  out[0] = l;
  out[1] = a;
  out[2] = b;
  return out;
};

export const oklabToOkhsv = (lab, gamut = sRGBGamut, out = vec3()) => {
  // Oklab to Okhsv.
  const lmsToRgb = getGamutLMStoRGB(gamut);

  // Epsilon for saturation just needs to be sufficiently close when denoting achromatic
  let ε = 1e-4;
  let l = lab[0];
  let s = 0.0;
  let v = toe(l);
  let c = Math.sqrt(lab[1] ** 2 + lab[2] ** 2);
  let h = 0.5 + Math.atan2(-lab[2], -lab[1]) / tau;

  if (l !== 0.0 && l !== 1 && c !== 0.0) {
    let a_ = lab[1] / c;
    let b_ = lab[2] / c;

    const cusp = findCusp(a_, b_, gamut, tmp2Cusp);
    computeSt(cusp, tmp2A);
    const sMax = tmp2A[0];
    const tMax = tmp2A[1];

    let s0 = 0.5;
    let k = 1 - s0 / sMax;

    // first we find `L_v`, `C_v`, `L_vt` and `C_vt`
    let t = tMax / (c + l * tMax);
    let lv = t * l;
    let cv = t * c;

    const scaleL = toScaleL(lv, cv, a_, b_, lmsToRgb);

    l = l / scaleL;
    c = c / scaleL;

    const toeL = toe(l);
    c = (c * toeL) / l;
    l = toeL;

    // we can now compute v and s:
    v = l / lv;
    s = ((s0 + tMax) * cv) / (tMax * s0 + tMax * k * cv);
  }

  // unlike colorjs.io, we are not worknig with none-types
  // if (Math.abs(s) < ε || v === 0.0) {
  //   h = null;
  // }

  h = constrain(h * 360);

  out[0] = h;
  out[1] = s;
  out[2] = v;
  return out;
};
