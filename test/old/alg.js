import {
  XYZ_to_LMS_M,
  XYZ_to_linear_sRGB_M,
  linear_sRGB_to_XYZ_M,
  linear_sRGB_to_LMS_M,
  LMS_to_linear_sRGB_M,
} from "../../src/color/conversion_matrices.js";

const linear_sRGB_to_LMS_M_2 = matmul(XYZ_to_LMS_M, linear_sRGB_to_XYZ_M);
const LMS_to_linear_sRGB_M_2 = inv(linear_sRGB_to_LMS_M_2);
console.log(linear_sRGB_to_LMS_M, linear_sRGB_to_LMS_M_2);
console.log(LMS_to_linear_sRGB_M, LMS_to_linear_sRGB_M_2);

export function matmul(a, b) {
  let aRows = a.length;
  let aCols = a[0].length;
  let bRows = b.length;
  let bCols = b[0].length;
  let result = new Array(aRows);

  for (let r = 0; r < aRows; r++) {
    result[r] = new Array(bCols).fill(0);
    for (let c = 0; c < bCols; c++) {
      for (let i = 0; i < aCols; i++) {
        result[r][c] += a[r][i] * b[i][c];
      }
    }
  }

  return result;
}

export function inv(matrix) {
  const v0 = matrix[0];
  const v1 = matrix[1];
  const v2 = matrix[2];
  const r0 = v1[1] * v2[2] - v1[2] * v2[1];
  const r1 = v1[0] * v2[2] - v1[2] * v2[0];
  const r2 = v1[0] * v2[1] - v1[1] * v2[0];
  // Calculate the determinant of a 3x3 matrix
  const det = v0[0] * r0 - v0[1] * r1 + v0[2] * r2;
  if (det === 0) throw new Error("mat3 is not invertible");
  // Calculate the adjugate matrix
  return [
    [
      r0 / det,
      -(v0[1] * v2[2] - v0[2] * v2[1]) / det,
      (v0[1] * v1[2] - v0[2] * v1[1]) / det,
    ],
    [
      -r1 / det,
      (v0[0] * v2[2] - v0[2] * v2[0]) / det,
      -(v0[0] * v1[2] - v0[2] * v1[0]) / det,
    ],
    [
      r2 / det,
      -(v0[0] * v2[1] - v0[1] * v2[0]) / det,
      (v0[0] * v1[1] - v0[1] * v1[0]) / det,
    ],
  ];
}
