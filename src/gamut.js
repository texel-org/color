import {
  clamp,
  degToRad,
  lerp,
  clampedRGB,
  isRGBInGamut,
  vec3,
} from "./util.js";
import { OKLab_to_LMS_M } from "./conversion_matrices.js";
import { sRGBGamut, OKLCH, OKLab } from "./spaces.js";
import { OKLab_to, convert } from "./core.js";

export const MapAdaptiveGrayFn =
  (alpha = 0.05) =>
  (oklch, cusp) => {
    const Ld = oklch[0] - cusp[0];
    const k = 2 * (Ld > 0 ? 1 - cusp[0] : cusp[0]);
    const e1 = 0.5 * k + Math.abs(Ld) + (alpha * oklch[1]) / k;
    return (
      cusp[0] +
      0.5 * (Math.sign(Ld) * (e1 - Math.sqrt(e1 * e1 - 2 * k * Math.abs(Ld))))
    );
  };

export const MapAdaptiveCuspLFn =
  (alpha = 0.05) =>
  (oklch) => {
    const Ld = oklch[0] - 0.5;
    const e1 = 0.5 + Math.abs(Ld) + alpha * oklch[1];
    return (
      0.5 * (1 + Math.sign(Ld) * (e1 - Math.sqrt(e1 * e1 - 2.0 * Math.abs(Ld))))
    );
  };

export const MapToL = (oklch) => oklch[0];
export const MapToGray = () => 0.5;
export const MapToCuspL = (_, cusp) => cusp[0];
export const MapToAdaptiveGray = MapAdaptiveGrayFn();
export const MapToAdaptiveCuspL = MapAdaptiveCuspLFn();

const floatMax = Number.MAX_VALUE;

const tmp2 = [0, 0];
const tmp3 = vec3();

// performs dot between vec3 A and B, but only on the YZ channels
const dotYZ = (a, b) => a[1] * b[1] + a[2] * b[2];

// regular dot product for 2D and 3D vectors
const dotXY = (a, b) => a[0] * b[0] + a[1] * b[1];
const dotXYZ = (vec, x, y, z) => vec[0] * x + vec[1] * y + vec[2] * z;

const setXY = (v, a, b) => {
  v[0] = a;
  v[1] = b;
};

const setYZ = (v, a, b) => {
  v[1] = a;
  v[2] = b;
};

export const computeMaxSaturation = (a, b, lmsToRgb, okCoeff) => {
  // https://github.com/color-js/color.js/blob/main/src/spaces/okhsl.js
  // Finds the maximum saturation possible for a given hue that fits in RGB.
  //
  // Saturation here is defined as `S = C/L`.
  // `a` and `b` must be normalized so `a^2 + b^2 == 1`.

  // Max saturation will be when one of r, g or b goes below zero.

  // Select different coefficients depending on which component goes below zero first.

  let k0, k1, k2, k3, k4, wl, wm, ws;

  setXY(tmp2, a, b);
  setYZ(tmp3, a, b);

  let chnlCoeff, chnlLMS;
  // TODO: check performance of array destructuring...
  if (dotXY(okCoeff[0][0], tmp2) > 1) {
    // Red component
    chnlCoeff = okCoeff[0][1];
    chnlLMS = lmsToRgb[0];
  } else if (dotXY(okCoeff[1][0], tmp2) > 1) {
    // Green component
    chnlCoeff = okCoeff[1][1];
    chnlLMS = lmsToRgb[1];
  } else {
    // Blue component
    chnlCoeff = okCoeff[2][1];
    chnlLMS = lmsToRgb[2];
  }

  k0 = chnlCoeff[0];
  k1 = chnlCoeff[1];
  k2 = chnlCoeff[2];
  k3 = chnlCoeff[3];
  k4 = chnlCoeff[4];
  wl = chnlLMS[0];
  wm = chnlLMS[1];
  ws = chnlLMS[2];

  // Approximate max saturation using a polynomial:
  let sat = k0 + k1 * a + k2 * b + k3 * (a * a) + k4 * a * b;

  // Do one step Halley's method to get closer.
  // This gives an error less than 10e6, except for some blue hues where the `dS/dh` is close to infinite.
  // This should be sufficient for most applications, otherwise do two/three steps.

  let kl = dotYZ(OKLab_to_LMS_M[0], tmp3);
  let km = dotYZ(OKLab_to_LMS_M[1], tmp3);
  let ks = dotYZ(OKLab_to_LMS_M[2], tmp3);

  let l_ = 1.0 + sat * kl;
  let m_ = 1.0 + sat * km;
  let s_ = 1.0 + sat * ks;

  let l = l_ * l_ * l_;
  let m = m_ * m_ * m_;
  let s = s_ * s_ * s_;

  let lds = 3.0 * kl * (l_ * l_);
  let mds = 3.0 * km * (m_ * m_);
  let sds = 3.0 * ks * (s_ * s_);

  let lds2 = 6.0 * (kl * kl) * l_;
  let mds2 = 6.0 * (km * km) * m_;
  let sds2 = 6.0 * (ks * ks) * s_;

  let f = wl * l + wm * m + ws * s;
  let f1 = wl * lds + wm * mds + ws * sds;
  let f2 = wl * lds2 + wm * mds2 + ws * sds2;

  sat = sat - (f * f1) / (f1 * f1 - 0.5 * f * f2);

  return sat;
};

export const getGamutLMStoRGB = (gamut) => {
  if (!gamut) throw new Error(`expected gamut to have { space }`);
  const lmsToRGB = (gamut.space.base ?? gamut.space).fromLMS_M;
  if (!lmsToRGB)
    throw new Error(`expected gamut { space } to have a fromLMS_M matrix`);
  return lmsToRGB;
};

export const findCusp = (a, b, gamut, out = [0, 0]) => {
  const lmsToRgb = getGamutLMStoRGB(gamut);
  const okCoeff = gamut.coefficients;
  if (!okCoeff) throw new Error("expected gamut to have { coefficients }");
  // const lmsToRgb, okCoeff
  // First, find the maximum saturation (saturation S = C/L)
  var S_cusp = computeMaxSaturation(a, b, lmsToRgb, okCoeff);
  // Convert to linear RGB to find the first point where at least one of r,g or b >= 1:
  tmp3[0] = 1;
  tmp3[1] = S_cusp * a;
  tmp3[2] = S_cusp * b;
  var rgb_at_max = OKLab_to(tmp3, lmsToRgb, tmp3);
  var L_cusp = Math.cbrt(
    1 / Math.max(Math.max(rgb_at_max[0], rgb_at_max[1]), rgb_at_max[2])
  );
  var C_cusp = L_cusp * S_cusp;
  out[0] = L_cusp;
  out[1] = C_cusp;
  return out;
};

export const findGamutIntersection = (a, b, l1, c1, l0, cusp, gamut) => {
  // Finds intersection of the line.
  //
  // Defined by the following:
  //
  // ```
  // L = L0 * (1 - t) + t * L1
  // C = t * C1
  // ```
  //
  // `a` and `b` must be normalized so `a^2 + b^2 == 1`.

  let t;

  const lmsToRgb = getGamutLMStoRGB(gamut);
  if (!cusp) throw new Error("must pass cusp");

  setYZ(tmp3, a, b);

  // Find the intersection for upper and lower half separately
  if ((l1 - l0) * cusp[1] - (cusp[0] - l0) * c1 <= 0.0) {
    // Lower half
    t = (cusp[1] * l0) / (c1 * cusp[0] + cusp[1] * (l0 - l1));
  } else {
    // Upper half

    // First intersect with triangle
    t = (cusp[1] * (l0 - 1.0)) / (c1 * (cusp[0] - 1.0) + cusp[1] * (l0 - l1));

    // Then one step Halley's method
    let dl = l1 - l0;
    let dc = c1;

    let kl = dotYZ(OKLab_to_LMS_M[0], tmp3);
    let km = dotYZ(OKLab_to_LMS_M[1], tmp3);
    let ks = dotYZ(OKLab_to_LMS_M[2], tmp3);

    let ldt_ = dl + dc * kl;
    let mdt_ = dl + dc * km;
    let sdt_ = dl + dc * ks;

    // If higher accuracy is required, 2 or 3 iterations of the following block can be used:
    let L = l0 * (1.0 - t) + t * l1;
    let C = t * c1;

    let l_ = L + C * kl;
    let m_ = L + C * km;
    let s_ = L + C * ks;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    let ldt = 3 * ldt_ * l_ * l_;
    let mdt = 3 * mdt_ * m_ * m_;
    let sdt = 3 * sdt_ * s_ * s_;

    let ldt2 = 6 * ldt_ * ldt_ * l_;
    let mdt2 = 6 * mdt_ * mdt_ * m_;
    let sdt2 = 6 * sdt_ * sdt_ * s_;

    let r_ = dotXYZ(lmsToRgb[0], l, m, s) - 1;
    let r1 = dotXYZ(lmsToRgb[0], ldt, mdt, sdt);
    let r2 = dotXYZ(lmsToRgb[0], ldt2, mdt2, sdt2);

    let ur = r1 / (r1 * r1 - 0.5 * r_ * r2);
    let tr = -r_ * ur;

    let g_ = dotXYZ(lmsToRgb[1], l, m, s) - 1;
    let g1 = dotXYZ(lmsToRgb[1], ldt, mdt, sdt);
    let g2 = dotXYZ(lmsToRgb[1], ldt2, mdt2, sdt2);

    let ug = g1 / (g1 * g1 - 0.5 * g_ * g2);
    let tg = -g_ * ug;

    let b_ = dotXYZ(lmsToRgb[2], l, m, s) - 1;
    let b1 = dotXYZ(lmsToRgb[2], ldt, mdt, sdt);
    let b2 = dotXYZ(lmsToRgb[2], ldt2, mdt2, sdt2);

    let ub = b1 / (b1 * b1 - 0.5 * b_ * b2);
    let tb = -b_ * ub;

    tr = ur >= 0.0 ? tr : floatMax;
    tg = ug >= 0.0 ? tg : floatMax;
    tb = ub >= 0.0 ? tb : floatMax;

    t += Math.min(tr, Math.min(tg, tb));
  }

  return t;
};

/**
 * Takes any OKLCH value and maps it to fall within the given gamut.
 */
export const gamutMapOKLCH = (
  oklch,
  gamut = sRGBGamut,
  targetSpace = gamut.space,
  out = vec3(),
  mapping = MapToCuspL
) => {
  const gamutSpace = gamut.space;
  const coeff = gamut.coefficients;
  if (!coeff || !gamutSpace) {
    throw new Error(`expected gamut with { space, coefficients }`);
  }
  const gamutSpaceBase = gamutSpace.base ?? gamutSpace;
  const lmsToRgb = gamutSpaceBase.fromLMS_M;
  if (!lmsToRgb) {
    throw new Error(
      `color space ${outSpace.id} has no base with LMS to RGB matrix`
    );
  }

  // tmp output for R,G,B
  const rgbVec = tmp3;

  // first, let's clamp lightness and chroma
  out[0] = clamp(oklch[0], 0, 1);
  out[1] = Math.max(oklch[1], 0);
  out[2] = oklch[2]; // hue remains constant

  // convert oklch to base gamut space (i.e. linear sRGB)
  convert(out, OKLCH, gamutSpaceBase, rgbVec);

  // check where the point lies in gamut space
  if (!isRGBInGamut(rgbVec, 0)) {
    // we aren't in gamut, so let's map toward it
    const L = out[0];
    const C = out[1];
    const H = out[2];
    const hueAngle = degToRad(H);
    const aNorm = Math.cos(hueAngle);
    const bNorm = Math.sin(hueAngle);

    // choose our strategy
    const cusp = findCusp(aNorm, bNorm, gamut, tmp2);
    const LTarget = mapping(out, cusp);

    let t = findGamutIntersection(aNorm, bNorm, L, C, LTarget, cusp, gamut);
    out[0] = lerp(LTarget, L, t);
    out[1] *= t;

    // special case: if requested targetSpace is base=OKLCH, we can return early.
    // note this creates a potential difference compared to other targetSpaces, which
    // will be clipped in RGB before converting to the target space.
    // however, due to floating point arithmetic, a user doing OKLCH -> RGB will still
    // need to clip the result again anyways, so perhaps this difference is negligible.
    const targetSpaceBase = targetSpace.base ?? targetSpaceBase;
    if (targetSpaceBase == OKLab) {
      return convert(out, OKLCH, targetSpace, out);
    }

    // now that we have a LCH that sits on the gamut, convert again to linear space
    convert(out, OKLCH, gamutSpaceBase, rgbVec);
  }
  // clip the linear RGB to 0..1 range
  clampedRGB(rgbVec, rgbVec);
  // finally, convert linear RGB to the final target space (e.g. sRGB or XYZ)
  // this is often just a linear to gamma transfer, unless another target space is specified
  convert(rgbVec, gamutSpaceBase, targetSpace, out);
  return out;
};
