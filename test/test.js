import test from "tape";
import Color from "colorjs.io";
import arrayAlmostEqual from "./almost-equal.js";
import {
  floatToByte,
  hexToRGB,
  isRGBInGamut,
  RGBtoHex,
  linear_sRGB_to_LMS_M,
  LMS_to_linear_sRGB_M,
  LMS_to_XYZ_M,
  XYZ_to_linear_sRGB_M,
  XYZ_to_LMS_M,
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
  findCusp,
  gamutMapOKLCH,
  degToRad,
  okhslToOklab,
  okhsvToOklab,
  oklabToOkhsl,
  oklabToOkhsv,
  XYZD65ToD50,
  XYZD50ToD65,
  XYZD50,
  ProPhotoRGB,
  ProPhotoRGBLinear,
} from "../src/index.js";

import { XYZ_to_linear_ProPhotoRGB_M } from "../src/conversion_matrices.js";

test("should convert XYZ in different whitepoints", async (t) => {
  const oklab = [0.56, 0.03, -0.1];
  const xyz_d65_input = new Color("oklab", oklab).to("xyz").coords;
  const xyz_d50_output = new Color("xyz", xyz_d65_input).to("xyz-d50").coords;

  let tmp = [0, 0, 0];
  const out = XYZD65ToD50(xyz_d65_input, tmp);
  t.equal(tmp, out);
  t.deepEqual(out, xyz_d50_output);

  tmp = [0, 0, 0];
  const out2 = XYZD50ToD65(xyz_d50_output, tmp);
  t.deepEqual(out2, xyz_d65_input);
  t.equal(out2, tmp);

  t.deepEqual(convert(xyz_d50_output, XYZD50, XYZ), xyz_d65_input);
  t.deepEqual(convert(xyz_d65_input, XYZ, XYZD50), xyz_d50_output);
});

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

test("should convert D65 based to D50 based color spaces", async (t) => {
  const rgbin = [0.25, 0.5, 1];
  const xyzD65Input = new Color("srgb", rgbin).to("xyz-d65").coords;
  const xyzD50Input = XYZD65ToD50(xyzD65Input);

  const prophotoFromXYZD65_expected = new Color("xyz-d65", xyzD65Input).to(
    "prophoto-linear"
  ).coords;

  const ret = convert(xyzD65Input, XYZ, ProPhotoRGBLinear);
  t.deepEqual(ret, prophotoFromXYZD65_expected);

  const xyzD65 = convert(prophotoFromXYZD65_expected, ProPhotoRGBLinear, XYZ);
  t.deepEqual(arrayAlmostEqual(xyzD65, xyzD65Input), true);

  const prophoto2 = convert(rgbin, sRGB, ProPhotoRGBLinear);
  // const prophoto2 = transform(
  //   XYZD65ToD50(new Color("srgb", rgbin).to("xyz-d65").coords),
  //   ProPhotoRGBLinear.fromXYZ_M
  // );
  const prophotoExpected = new Color("srgb", rgbin).to(
    "prophoto-linear"
  ).coords;
  t.deepEqual(prophoto2, prophotoExpected);

  const oklabIn = new Color("srgb", rgbin).to("oklab").coords;
  const oklabToProphoto = new Color("oklab", oklabIn).to(
    "prophoto-linear"
  ).coords;
  t.deepEqual(
    arrayAlmostEqual(
      convert(oklabIn, OKLab, ProPhotoRGBLinear),
      oklabToProphoto
    ),
    true
  );

  const oklabIn2 = [1, 1, 1];
  const oklabToProphoto2 = new Color("oklab", oklabIn2).to("prophoto").coords;

  t.deepEqual(
    arrayAlmostEqual(convert(oklabIn2, OKLab, ProPhotoRGB), oklabToProphoto2),
    true
  );

  // const sRGBInput = [0.25, 0.5, 1];
  // const prophoto_expected = new Color("srgb", sRGBInput).to("prophoto").coords;

  // const out = [0, 0, 0];
  // const ret = convert(sRGBInput, sRGB, ProPhotoRGB, out);
  // t.deepEqual(ret, prophoto_expected);
});

function roundToNDecimals(value, digits) {
  var tenToN = 10 ** digits;
  return Math.round(value * tenToN) / tenToN;
}
