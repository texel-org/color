import {
  convert,
  vec3,
  transform,
  sRGB,
  XYZ,
  constrainAngle,
  degToRad,
} from "../../src/index.js";

export const XYZ_D65_to_sLMS_M = [
  [0.4002, 0.7075, -0.0807],
  [-0.228, 1.15, 0.0612],
  [0.0, 0.0, 0.9184],
];

export const sLMSp_to_sLab_M = [
  [200 / 3.05, 100 / 3.05, 5 / 3.05],
  [430, -470, 40],
  [49, 49, -98],
];

export const sLMS_to_XYZ_D65_M = [
  [1.8502429449432054, -1.1383016378672328, 0.23843495850870136],
  [0.36683077517134854, 0.6438845448402355, -0.010673443584379992],
  [0.0, 0.0, 1.088850174216028],
];

export const sLab_to_sLMSp_M = [
  [0.010000000000000002, 0.0007468123861566486, 0.0004721014088695587],
  [0.01, -0.0014754098360655738, -0.0004349280695884911],
  [0.009999999999999998, -0.00036429872495446266, -0.010185494963012527],
];

const POWER = 0.43;
const INV_POWER = 1.0 / POWER;

const forwardPower = (v) =>
  v >= 0 ? Math.pow(v, POWER) : -Math.pow(-v, POWER);
const invPower = (v) =>
  v >= 0 ? Math.pow(v, INV_POWER) : -Math.pow(-v, INV_POWER);

/**
 * @type {ColorSpace}
 * @category spaces
 */
export const sLab = {
  id: "slab",
  toXYZ(Lab, out = vec3()) {
    // sLab --> sLMSp
    const sLMSp = transform(Lab, sLab_to_sLMSp_M, out);

    // sLMSp --> sLMS
    sLMSp[0] = invPower(sLMSp[0]);
    sLMSp[1] = invPower(sLMSp[1]);
    sLMSp[2] = invPower(sLMSp[2]);

    // sLMS --> XYZ D65
    return transform(sLMSp, sLMS_to_XYZ_D65_M, out);
  },
  fromXYZ(xyz, out = vec3()) {
    // XYZ D65 --> sLMS
    const sLMS = transform(xyz, XYZ_D65_to_sLMS_M, out);

    // sLMS --> sLMSp
    sLMS[0] = forwardPower(sLMS[0]);
    sLMS[1] = forwardPower(sLMS[1]);
    sLMS[2] = forwardPower(sLMS[2]);

    // sLMSp --> sLab
    return transform(sLMS, sLMSp_to_sLab_M, out);
  },
};

export const sLCH = {
  id: "slch",
  base: sLab,
  toBase(LCH, out = vec3()) {
    const C = LCH[1];
    const H = LCH[2];

    const r = (Math.exp(0.0252 * C) - 1) / 0.0447;
    const Hrad = (H * Math.PI) / 180;
    const a = r * Math.cos(Hrad);
    const b = r * Math.sin(Hrad);

    out[0] = LCH[0];
    out[1] = a;
    out[2] = b;
    return out;
  },
  fromBase(Lab, out = vec3()) {
    const L = Lab[0];
    const a = Lab[1];
    const b = Lab[2];

    const ACHROMATIC_EPSILON = 0.1;
    let isAchromatic =
      Math.abs(a) < ACHROMATIC_EPSILON && Math.abs(b) < ACHROMATIC_EPSILON;
    let H = isAchromatic
      ? 0
      : constrainAngle((Math.atan2(b, a) * 180) / Math.PI);
    let C = isAchromatic
      ? 0
      : (1 / 0.0252) * Math.log(1 + 0.0447 * Math.sqrt(a * a + b * b));

    out[0] = L;
    out[1] = C;
    out[2] = H;
    return out;
  },
};

// const Fl =
// const Z = 1.48 + Math.sqrt((Yb/Yw))

// function check() {
//   const xyzD65 = convert([0.5, 0.25, 0.75], sRGB, XYZ);
//   const lab = convert(xyzD65, XYZ, sLab);
//   const xyz = convert(lab, sLab, XYZ);
//   console.log("Input XYZ D65", xyzD65);
//   console.log("Lab", lab);
//   console.log("XYZ From Lab", xyz);
//   const lch = convert(lab, sLab, sLCH);
//   const lab1 = convert(lch, sLCH, sLab);
//   console.log("LCH", lch);
//   console.log("Lab from LCH", lab1);

//   const labBounds = [
//     [Infinity, Infinity, Infinity],
//     [-Infinity, -Infinity, -Infinity],
//   ];
//   const lchBounds = [
//     [Infinity, Infinity, Infinity],
//     [-Infinity, -Infinity, -Infinity],
//   ];

//   const steps = 4;
//   for (let r = 0; r < 256; r += steps) {
//     for (let g = 0; g < 256; g += steps) {
//       for (let b = 0; b < 256; b += steps) {
//         const rgb = [r, g, b].map((v) => v / 255);
//         const xyz = convert(rgb, sRGB, XYZ);
//         const lab = convert(xyz, XYZ, sLab);
//         const lch = convert(lab, sLab, sLCH);
//         for (let i = 0; i < 3; i++) {
//           labBounds[0][i] = Math.min(labBounds[0][i], lab[i]);
//           labBounds[1][i] = Math.max(labBounds[1][i], lab[i]);
//           lchBounds[0][i] = Math.min(lchBounds[0][i], lch[i]);
//           lchBounds[1][i] = Math.max(lchBounds[1][i], lch[i]);
//         }
//       }
//     }
//   }

//   console.log("Lab Bounds", labBounds);
//   console.log("LCH Bounds", lchBounds);
// }
