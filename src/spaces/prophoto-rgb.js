import { vec3 } from "../util.js";
import {
  linear_ProPhotoRGB_to_XYZ_M,
  XYZ_to_linear_ProPhotoRGB_M,
} from "../conversion_matrices.js";
import { D50_to_D65_M, D65_to_D50_M } from "./xyz.js";

const Et = 1 / 512;
const Et2 = 16 / 512;

// Transfer curve is gamma 1.8 with a small linear portion
const ProPhotoRGBToLinear = (v) => (v < Et2 ? v / 16 : v ** 1.8);
const ProPhotoRGBToGamma = (v) => (v >= Et ? v ** (1 / 1.8) : 16 * v);

// Note: below is a possibly improved transfer function proposed by CSS Module 4 spec
// It is currently not matching the outputs of Colorjs.io when dealing with particular
// negative values, such as convert([1,1,1], OKlab, ProPhotoRGB)

// const ProPhotoRGBToLinear = (val) => {
//   // convert an array of prophoto-rgb values
//   // where in-gamut colors are in the range [0.0 - 1.0]
//   // to linear light (un-companded) form.
//   // Transfer curve is gamma 1.8 with a small linear portion
//   let sign = val < 0 ? -1 : 1;
//   let abs = Math.abs(val);
//   return abs <= Et2 ? val / 16 : sign * Math.pow(abs, 1.8);
// };

// const ProPhotoRGBToGamma = (val) => {
//   // convert an array of linear-light prophoto-rgb  in the range 0.0-1.0
//   // to gamma corrected form
//   // Transfer curve is gamma 1.8 with a small linear portion
//   let sign = val < 0 ? -1 : 1;
//   let abs = Math.abs(val);
//   return abs >= Et ? sign * Math.pow(abs, 1 / 1.8) : 16 * val;
// };

export const ProPhotoRGBLinear = {
  id: "prophoto-rgb-linear",
  adapt: {
    // chromatic adaptation to and from D65
    to: D50_to_D65_M,
    from: D65_to_D50_M,
  },
  // Note these are in D50
  toXYZ_M: linear_ProPhotoRGB_to_XYZ_M,
  fromXYZ_M: XYZ_to_linear_ProPhotoRGB_M,
};

export const ProPhotoRGB = {
  id: "prophoto-rgb",
  base: ProPhotoRGBLinear,
  toBase: (vec, out = vec3()) => {
    out[0] = ProPhotoRGBToLinear(vec[0]);
    out[1] = ProPhotoRGBToLinear(vec[1]);
    out[2] = ProPhotoRGBToLinear(vec[2]);
    return out;
  },
  fromBase: (vec, out = vec3()) => {
    out[0] = ProPhotoRGBToGamma(vec[0]);
    out[1] = ProPhotoRGBToGamma(vec[1]);
    out[2] = ProPhotoRGBToGamma(vec[2]);
    return out;
  },
};

// Note: this is currently not supported, some overflows are occurring
// in the python script. Please file an issue or PR if you think you can help.
// export const ProPhotoRGBGamut = {
//   space: ProPhotoRGB,
//   coefficients: OKLab_to_linear_ProPhotoRGB_coefficients,
// };
