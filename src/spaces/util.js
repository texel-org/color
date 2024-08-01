import { vec3 } from "../util.js";

export const sRGBGammaToLinear = (val) => {
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

export const sRGBLinearToGamma = (val) => {
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

export const sRGBLinearToGammaVec3 = (vec, out = vec3()) => {
  out[0] = sRGBLinearToGamma(vec[0]);
  out[1] = sRGBLinearToGamma(vec[1]);
  out[2] = sRGBLinearToGamma(vec[2]);
  return out;
};

export const sRGBGammaToLinearVec3 = (vec, out = vec3()) => {
  out[0] = sRGBGammaToLinear(vec[0]);
  out[1] = sRGBGammaToLinear(vec[1]);
  out[2] = sRGBGammaToLinear(vec[2]);
  return out;
};
