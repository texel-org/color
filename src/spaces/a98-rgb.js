import { vec3 } from "../util.js";
import {
  linear_A98RGB_to_XYZ_M,
  XYZ_to_linear_A98RGB_M,
  linear_A98RGB_to_LMS_M,
  LMS_to_linear_A98RGB_M,
  OKLab_to_linear_A98RGB_coefficients,
} from "../conversion_matrices.js";

const A98RGBToLinear = (val) => {
  let sign = val < 0 ? -1 : 1;
  let abs = Math.abs(val);
  return sign * Math.pow(abs, 563 / 256);
};

const A98RGBToGamma = (val) => {
  let sign = val < 0 ? -1 : 1;
  let abs = Math.abs(val);
  return sign * Math.pow(abs, 256 / 563);
};

export const A98RGBLinear = {
  id: "a98-rgb-linear",
  toXYZ_M: linear_A98RGB_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_A98RGB_M,
  toLMS_M: linear_A98RGB_to_LMS_M,
  fromLMS_M: LMS_to_linear_A98RGB_M,
};

export const A98RGB = {
  id: "a98-rgb",
  base: A98RGBLinear,
  toBase: (vec, out = vec3()) => {
    out[0] = A98RGBToLinear(vec[0]);
    out[1] = A98RGBToLinear(vec[1]);
    out[2] = A98RGBToLinear(vec[2]);
    return out;
  },
  fromBase: (vec, out = vec3()) => {
    out[0] = A98RGBToGamma(vec[0]);
    out[1] = A98RGBToGamma(vec[1]);
    out[2] = A98RGBToGamma(vec[2]);
    return out;
  },
};

export const A98RGBGamut = {
  space: A98RGB,
  coefficients: OKLab_to_linear_A98RGB_coefficients,
};
