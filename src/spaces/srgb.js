import {
  linear_sRGB_to_LMS_M,
  linear_sRGB_to_XYZ_M,
  LMS_to_linear_sRGB_M,
  XYZ_to_linear_sRGB_M,
  OKLab_to_linear_sRGB_coefficients,
} from "../conversion_matrices.js";

import { sRGBGammaToLinearVec3, sRGBLinearToGammaVec3 } from "./util.js";

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
  toBase: sRGBGammaToLinearVec3,
  fromBase: sRGBLinearToGammaVec3,
};

export const sRGBGamut = {
  space: sRGB,
  coefficients: OKLab_to_linear_sRGB_coefficients,
};
