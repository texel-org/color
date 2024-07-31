import test from "tape";
import {
  floatToByte,
  hexToRGB,
  isRGBInGamut,
  RGBtoHex,
} from "../src/color/util.js";
import {
  linear_sRGB_to_LMS_M,
  LMS_to_linear_sRGB_M,
  LMS_to_XYZ_M,
  XYZ_to_linear_sRGB_M,
  XYZ_to_LMS_M,
} from "../src/color/conversion_matrices.js";
import Color from "colorjs.io";
import { mat3 } from "gl-matrix";
import arrayAlmostEqual from "array-almost-equal";
import {
  convert,
  OKLab,
  OKLCH,
  sRGB,
  sRGBLinear,
  XYZ,
  OKLab_from,
  OKLab_to,
  transform,
  OKHSL,
  sRGBGamut,
  OKHSV,
  serialize,
} from "../src/color/convert.js";
import { findCusp, gamutMapOKLCH } from "../src/color/gamut.js";
import { degToRad } from "./old/math/util.js";
import {
  okhslToOklab,
  okhsvToOklab,
  oklabToOkhsl,
  oklabToOkhsv,
} from "../src/color/okhsl.js";

test("should convert", async (t) => {
  const oklab = [0.56, 0.03, -0.1];
  const rgbExpected = new Color("oklab", oklab)
    .to("srgb")
    .coords.map((n) => floatToByte(n));

  const lrgb = OKLab_to(oklab, LMS_to_linear_sRGB_M);
  const rgb = convert(lrgb, sRGBLinear, sRGB).map((f) => floatToByte(f));
  t.deepEqual(rgb, rgbExpected, "oklab to srgb");

  const inArray = oklab.slice();
  const outArray = OKLab_to(oklab, LMS_to_linear_sRGB_M, inArray);
  t.equal(inArray, outArray);

  const oklab2 = OKLab_from(lrgb, linear_sRGB_to_LMS_M);
  t.equals(arrayAlmostEqual(oklab, oklab2), true, "linear srgb to oklab");

  const xyzExpected = new Color("oklab", oklab).to("xyz").coords;
  const xyz0 = OKLab_to(oklab, LMS_to_XYZ_M);
  t.deepEqual(arrayAlmostEqual(xyzExpected, xyz0), true, "OKLab to XYZ");

  const oklabResult = OKLab_from(xyzExpected, XYZ_to_LMS_M);
  t.deepEqual(arrayAlmostEqual(oklabResult, oklab), true, "XYZ to OKLab");

  const xyzToLSRGBExpected = new Color("xyz", xyzExpected).to(
    "srgb-linear"
  ).coords;
  const xyzToLSRGB = transform(xyzExpected, XYZ_to_linear_sRGB_M);
  t.deepEqual(
    arrayAlmostEqual(xyzToLSRGB, xyzToLSRGBExpected),
    true,
    "XYZ to sRGB-linear"
  );

  // XYZ to sRGBLinear
  const outTest = [0, 0, 0];
  const outTest2 = convert(xyzExpected, XYZ, sRGBLinear, outTest);
  t.equal(outTest, outTest2, "returns out vec3");
  t.deepEqual(outTest, xyzToLSRGB);

  t.deepEqual(
    convert(xyzExpected, XYZ, sRGB),
    sRGB.fromBase(xyzToLSRGB),
    "XYZ to sRGB"
  );

  const sRGBL_from_XYZ = new Color("xyz", xyzExpected).to("srgb-linear").coords;

  t.ok(
    arrayAlmostEqual(convert(xyzExpected, XYZ, sRGBLinear), sRGBL_from_XYZ),
    true,
    "XYZ to sRGBLinear"
  );

  // from https://bottosson.github.io/posts/oklab/
  const knownPairsXYZToOKLab = [
    [
      [0.95, 1, 1.089],
      [1, 0, 0],
    ],
    [
      [1, 0, 0],
      [0.45, 1.236, -0.019],
    ],
    [
      [0, 1, 0],
      [0.922, -0.671, 0.263],
    ],
    [
      [0, 0, 1],
      [0.153, -1.415, -0.449],
    ],
  ];

  for (let [xyz, oklabExpected] of knownPairsXYZToOKLab) {
    const oklabRet = convert(xyz, XYZ, OKLab).map((n) => {
      n = roundToNDecimals(n, 3);
      if (n === -0) n = 0;
      return n;
    });
    t.deepEqual(oklabRet, oklabExpected);
  }

  const oklch = [0.5, -0.36, 90];
  t.deepEqual(
    convert(oklch, OKLCH, OKLab),
    new Color("oklch", oklch).to("oklab").coords,
    "handle negative chroma"
  );
  t.equal(
    arrayAlmostEqual(
      convert(oklch, OKLCH, sRGB),
      new Color("oklch", oklch).to("srgb").coords
    ),
    true
  );
});

test("should convert to okhsl", async (t) => {
  const okhsl = [30, 0.5, 0.5];
  const oklab = okhslToOklab(okhsl, sRGBGamut);
  const expectedLABfromOKHSL = [
    0.568838198942395, 0.08553885335853362, 0.049385880012721296,
  ];
  t.deepEqual(oklab, expectedLABfromOKHSL);
  const okhslOut = oklabToOkhsl(expectedLABfromOKHSL, sRGBGamut);
  t.deepEqual(okhslOut, okhsl);

  const okhsv = okhsl.slice();
  const expectedLABfromOKHSV = [
    0.45178419415172344, 0.06582951989066341, 0.03800669102949833,
  ];
  t.deepEqual(okhsvToOklab(okhsv, sRGBGamut), expectedLABfromOKHSV);
  t.deepEqual(
    arrayAlmostEqual(oklabToOkhsv(expectedLABfromOKHSV, sRGBGamut), okhsv),
    true
  );

  t.deepEqual(convert(okhsl, OKHSL, OKLab), expectedLABfromOKHSL);
  t.deepEqual(convert(okhsv, OKHSV, OKLab), expectedLABfromOKHSV);
  t.deepEqual(
    arrayAlmostEqual(convert(expectedLABfromOKHSV, OKLab, OKHSV), okhsv),
    true
  );
  t.deepEqual(
    arrayAlmostEqual(convert(expectedLABfromOKHSL, OKLab, OKHSL), okhsl),
    true
  );
});

test("should find cusp", async (t) => {
  const H = 30;
  const hueAngle = degToRad(H);

  const aNorm = Math.cos(hueAngle);
  const bNorm = Math.sin(hueAngle);
  const cusp = findCusp(aNorm, bNorm, sRGBGamut);
  const hue30sRGBCusp = [0.6322837041534409, 0.25358297891212667];
  // const hue30P3Cusp = [ 0.6542359095783608, 0.2931937837912376 ]
  t.deepEqual(cusp, hue30sRGBCusp);

  const l2 = 0.7;
  const c2 = 0.3;
  const newLCH = [l2, c2, H];
  const mapped = gamutMapOKLCH(newLCH, sRGBGamut, OKLCH);
  // const mapped = mapToGamutLcusp(
  //   newLCH,
  //   hue30sRGBCusp,
  //   LMS_to_linear_sRGB_M,
  //   OKLab_to_linear_sRGB_coefficients
  // );
  t.deepEqual(mapped, [0.679529110489262, 0.20930887792301692, 30]);
});

test("should gamut map", async (t) => {
  const oklch = [0.9, 0.4, 30];
  const rgb = convert(oklch, OKLCH, sRGB);
  t.equals(isRGBInGamut(rgb, 0), false);
});

test("should serialize", async (t) => {
  t.deepEqual(serialize([0, 0.5, 1], sRGB), "rgb(0, 128, 255)");
  t.deepEqual(serialize([0, 0.5, 1], sRGBLinear), "color(srgb-linear 0 0.5 1)");
  t.deepEqual(serialize([1, 0, 0], OKLCH, sRGB), "rgb(255, 255, 255)");
  t.deepEqual(serialize([1, 0, 0], OKLCH), "oklch(1 0 0)");
});

test("utils", async (t) => {
  t.deepEqual(RGBtoHex([0, 0.5, 1]), "#0080ff");
  t.deepEqual(hexToRGB("#0080ff"), [0, 0.5019607843137255, 1]);
  const tmp = [0, 0, 0];
  hexToRGB("#0080ff", tmp);
  t.deepEqual(tmp, [0, 0.5019607843137255, 1]);
});

function roundToNDecimals(value, digits) {
  var tenToN = 10 ** digits;
  return Math.round(value * tenToN) / tenToN;
}
