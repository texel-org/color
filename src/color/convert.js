import {
  linear_P3_to_LMS_M,
  linear_P3_to_XYZ_M,
  linear_rec2020_to_LMS_M,
  linear_rec2020_to_XYZ_M,
  linear_sRGB_to_LMS_M,
  linear_sRGB_to_XYZ_M,
  LMS_to_linear_P3_M,
  LMS_to_linear_rec2020_M,
  LMS_to_linear_sRGB_M,
  LMS_to_XYZ_M,
  XYZ_to_linear_P3_M,
  XYZ_to_linear_rec2020_M,
  XYZ_to_linear_sRGB_M,
  XYZ_to_LMS_M,
  LMS_to_OKLab_M,
  OKLab_to_LMS_M,
  OKLab_to_linear_P3_coefficients,
  OKLab_to_linear_rec2020_coefficients,
  OKLab_to_linear_sRGB_coefficients,
} from "./conversion_matrices.js";

import {
  okhslToOklab,
  okhsvToOklab,
  oklabToOkhsl,
  oklabToOkhsv,
} from "./okhsl.js";

import { floatToByte, vec3 } from "./util.js";

const tmp3 = vec3();

const cubed3 = (lms) => {
  const l = lms[0],
    m = lms[1],
    s = lms[2];
  lms[0] = l * l * l;
  lms[1] = m * m * m;
  lms[2] = s * s * s;
};

const cbrt3 = (lms) => {
  lms[0] = Math.cbrt(lms[0]);
  lms[1] = Math.cbrt(lms[1]);
  lms[2] = Math.cbrt(lms[2]);
};

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const OKLab_to = (OKLab, LMS_to_output, out = vec3()) => {
  transform(OKLab, OKLab_to_LMS_M, out);
  cubed3(out);
  return transform(out, LMS_to_output, out);
};

export const OKLab_from = (input, input_to_LMS, out = vec3()) => {
  transform(input, input_to_LMS, out);
  cbrt3(out);
  return transform(out, LMS_to_OKLab_M, out);
};

export const transform = (input, matrix, out = vec3()) => {
  const x = dot3(input, matrix[0]);
  const y = dot3(input, matrix[1]);
  const z = dot3(input, matrix[2]);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
};

const vec3Copy = (input, output) => {
  output[0] = input[0];
  output[1] = input[1];
  output[2] = input[2];
};

const gammaToLinear = (val) => {
  // Slightly faster, not handling negatives
  // return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);

  // convert a single channel value
  // where in-gamut values are in the range [0 - 1]
  // to linear light (un-companded) form.
  // https://en.wikipedia.org/wiki/SRGB
  // Extended transfer function:
  // for negative values,  linear portion is extended on reflection of axis,
  // then reflected power function is used.

  let sign = val < 0 ? -1 : 1;
  let abs = Math.abs(val);
  return abs <= 0.04045
    ? val / 12.92
    : sign * Math.pow((abs + 0.055) / 1.055, 2.4);
};

const linearToGamma = (val) => {
  // This is a little faster but does not handle negative values
  // return val <= 0.0031308
  //   ? 12.92 * val
  //   : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;

  // convert a single channel linear-light value in range 0-1
  // to gamma corrected form
  // https://en.wikipedia.org/wiki/SRGB
  // Extended transfer function:
  // For negative values, linear portion extends on reflection
  // of axis, then uses reflected pow below that
  let sign = val < 0 ? -1 : 1;
  let abs = Math.abs(val);
  return abs > 0.0031308
    ? sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055)
    : 12.92 * val;
};

const linear_to_gamma_vec3 = (vec, out = vec3()) => {
  out[0] = linearToGamma(vec[0]);
  out[1] = linearToGamma(vec[1]);
  out[2] = linearToGamma(vec[2]);
  return out;
};

const gamma_to_linear_vec3 = (vec, out = vec3()) => {
  out[0] = gammaToLinear(vec[0]);
  out[1] = gammaToLinear(vec[1]);
  out[2] = gammaToLinear(vec[2]);
  return out;
};

export const sRGBLinear = {
  id: "srgb-linear",
  toXYZ_M: linear_sRGB_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_sRGB_M,
  toLMS_M: linear_sRGB_to_LMS_M,
  fromLMS_M: LMS_to_linear_sRGB_M,
};

export const sRGB = {
  id: "srgb",
  base: sRGBLinear,
  toBase: gamma_to_linear_vec3,
  fromBase: linear_to_gamma_vec3,
};

export const DisplayP3Linear = {
  id: "display-p3-linear",
  toXYZ_M: linear_P3_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_P3_M,
  toLMS_M: linear_P3_to_LMS_M,
  fromLMS_M: LMS_to_linear_P3_M,
};

export const DisplayP3 = {
  id: "display-p3",
  base: DisplayP3Linear,
  toBase: gamma_to_linear_vec3,
  fromBase: linear_to_gamma_vec3,
};

export const XYZ = {
  id: "xyz",
  toLMS_M: XYZ_to_LMS_M,
  fromLMS_M: LMS_to_XYZ_M,
};

export const OKLab = {
  id: "oklab",
};

export const OKLCH = {
  id: "oklch",
  base: OKLab,
  toBase: (OKLCH, out = vec3()) => {
    // Note: some version of Colorjs.io clamps chroma
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

const ALPHA = 1.09929682680944;
const BETA = 0.018053968510807;

const rec2020_to_linear = (val) =>
  val < BETA * 4.5 ? val / 4.5 : Math.pow((val + ALPHA - 1) / ALPHA, 1 / 0.45);

const rec2020_to_gamma = (val) =>
  val >= BETA ? ALPHA * Math.pow(val, 0.45) - (ALPHA - 1) : 4.5 * val;

export const Rec2020Linear = {
  id: "rec2020-linear",
  toXYZ_M: linear_rec2020_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_rec2020_M,
  toLMS_M: linear_rec2020_to_LMS_M,
  fromLMS_M: LMS_to_linear_rec2020_M,
};

export const Rec2020 = {
  id: "rec2020",
  base: Rec2020Linear,
  toBase: (vec, out = vec3()) => {
    out[0] = rec2020_to_linear(vec[0]);
    out[1] = rec2020_to_linear(vec[1]);
    out[2] = rec2020_to_linear(vec[2]);
    return out;
  },
  fromBase: (vec, out = vec3()) => {
    out[0] = rec2020_to_gamma(vec[0]);
    out[1] = rec2020_to_gamma(vec[1]);
    out[2] = rec2020_to_gamma(vec[2]);
    return out;
  },
};

export const sRGBGamut = {
  space: sRGB,
  coefficients: OKLab_to_linear_sRGB_coefficients,
};
export const Rec2020Gamut = {
  space: Rec2020,
  coefficients: OKLab_to_linear_rec2020_coefficients,
};
export const DisplayP3Gamut = {
  space: DisplayP3,
  coefficients: OKLab_to_linear_P3_coefficients,
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

export const supportedColorSpaces = () => {
  return [
    XYZ,
    OKLab,
    OKLCH,
    OKHSV,
    OKHSL,
    sRGB,
    sRGBLinear,
    DisplayP3,
    DisplayP3Linear,
    Rec2020,
    Rec2020Linear,
  ];
};

export const serialize = (
  input,
  inputSpace = sRGB,
  outputSpace = inputSpace
) => {
  if (inputSpace !== outputSpace) {
    convert(input, inputSpace, outputSpace, tmp3);
  } else {
    vec3Copy(input, tmp3);
  }

  if (outputSpace == sRGB) {
    const r = floatToByte(tmp3[0]);
    const g = floatToByte(tmp3[1]);
    const b = floatToByte(tmp3[2]);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (outputSpace == OKLab || outputSpace == OKLCH) {
    return `${outputSpace.id}(${tmp3[0]} ${tmp3[1]} ${tmp3[2]}})`;
  } else {
    return `color(${outputSpace.id} ${tmp3[0]} ${tmp3[1]} ${tmp3[2]})`;
  }
};

export const convert = (input, fromSpace, toSpace, out = vec3()) => {
  const inputSpace = fromSpace;
  // place into output
  vec3Copy(input, out);

  if (!fromSpace) throw new Error(`must specify a fromSpace`);
  if (!toSpace) throw new Error(`must specify a toSpace`);

  // special case: no conversion needed
  if (fromSpace == toSpace) {
    return out;
  }

  // e.g. convert OKLCH -> OKLab or sRGB -> sRGBLinear
  if (fromSpace.base) {
    out = fromSpace.toBase(out, out);
    fromSpace = fromSpace.base;
  }

  let curBaseSpace = fromSpace;

  // which base are we converting to? e.g. if OKLCH, then use OKLab
  const toBaseSpace = toSpace.base ?? toSpace;

  if (curBaseSpace === toBaseSpace) {
    // base space is the same, we can safely skip
  } else if (curBaseSpace === OKLab) {
    // going from OKLab to another space
    if (!toBaseSpace.fromLMS_M)
      throw new Error(`no LMS matrix on base target: ${toBaseSpace.id}`);
    out = OKLab_to(out, toBaseSpace.fromLMS_M, out);
  } else if (toBaseSpace === OKLab) {
    // going from [base space] to OKLab
    if (!curBaseSpace.toLMS_M)
      throw new Error(`no LMS matrix on base source: ${curBaseSpace.id}`);
    out = OKLab_from(out, curBaseSpace.toLMS_M, out);
  } else {
    if (curBaseSpace === XYZ) {
      if (!toBaseSpace.fromXYZ_M)
        throw new Error(`no XYZ matrix on base target: ${toBaseSpace.id}`);
      // from XYZ to [base space]
      out = transform(out, toBaseSpace.fromXYZ_M, out);
    } else if (toBaseSpace === XYZ) {
      if (!curBaseSpace.toXYZ_M)
        throw new Error(`no XYZ matrix on base source: ${curBaseSpace.id}`);
      // from [base space] to XYZ
      out = transform(out, curBaseSpace.toXYZ_M, out);
    } else if (curBaseSpace.toXYZ_M && toBaseSpace.fromXYZ_M) {
      // we route through XYZ
      // [a] -> transform(xToXYZ) -> XYZ -> transform(xyzToX) -> [b]
      out = transform(out, curBaseSpace.toXYZ_M, out);
      out = transform(out, toBaseSpace.fromXYZ_M, out);
    } else {
      throw new Error(
        `no color space conversion path for ${inputSpace.id} to ${toSpace.id}`
      );
    }
  }

  // Now do the final transformation to the target space
  // e.g. OKLab -> OKLCH or sRGBLinear -> sRGB
  if (toBaseSpace !== toSpace) {
    if (toSpace.fromBase) {
      out = toSpace.fromBase(out, out);
    } else {
      throw new Error(`could not transform ${toBaseSpace.id} to ${toSpace.id}`);
    }
  }

  return out;
};
