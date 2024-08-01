import {
  linear_DisplayP3_to_LMS_M,
  linear_DisplayP3_to_XYZ_M,
  LMS_to_linear_DisplayP3_M,
  XYZ_to_linear_DisplayP3_M,
  OKLab_to_linear_DisplayP3_coefficients,
} from "../conversion_matrices.js";
import { sRGBGammaToLinearVec3, sRGBLinearToGammaVec3 } from "./util.js";

export const DisplayP3Linear = {
  id: "display-p3-linear",
  toXYZ_M: linear_DisplayP3_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_DisplayP3_M,
  toLMS_M: linear_DisplayP3_to_LMS_M,
  fromLMS_M: LMS_to_linear_DisplayP3_M,
};

export const DisplayP3 = {
  id: "display-p3",
  base: DisplayP3Linear,
  toBase: sRGBGammaToLinearVec3,
  fromBase: sRGBLinearToGammaVec3,
};

export const DisplayP3Gamut = {
  space: DisplayP3,
  coefficients: OKLab_to_linear_DisplayP3_coefficients,
};
