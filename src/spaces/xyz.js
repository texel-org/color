import { vec3 } from "../util.js";
import { transform } from "../core.js";
import { LMS_to_XYZ_M, XYZ_to_LMS_M } from "../conversion_matrices.js";

// Note: for the time being, these are not exported
// It may be exported in a future version
// for compatibility, the four-digit chromaticity-derived ones everyone else uses
// const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585];
// const D65 = [0.3127 / 0.329, 1.0, (1.0 - 0.3127 - 0.329) / 0.329];

// Bradford chromatic adaptation from D65 to D50
// The matrix below is the result of three operations:
// - convert from XYZ to retinal cone domain
// - scale components from one reference white to another
// - convert back to XYZ
// see https://github.com/LeaVerou/color.js/pull/354/files
export const D65_to_D50_M = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];

// Bradford chromatic adaptation from D50 to D65
// See https://github.com/LeaVerou/color.js/pull/360/files
export const D50_to_D65_M = [
  [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
  [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
  [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];

export const XYZD65ToD50 = (XYZ, out = vec3()) =>
  transform(XYZ, D65_to_D50_M, out);

export const XYZD50ToD65 = (XYZ, out = vec3()) =>
  transform(XYZ, D50_to_D65_M, out);

// XYZ using D65 whitepoint
export const XYZ = {
  id: "xyz", // xyz-d65
  toLMS_M: XYZ_to_LMS_M,
  fromLMS_M: LMS_to_XYZ_M,
};

// XYZ using D50 whitepoint
export const XYZD50 = {
  id: "xyz-d50",
  base: XYZ,
  toBase: XYZD50ToD65,
  fromBase: XYZD65ToD50,
};
