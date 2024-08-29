import test from "tape";
import Color from "colorjs.io";
import arrayAlmostEqual from "./almost-equal.js";
import {
  floatToByte,
  hexToRGB,
  isRGBInGamut,
  RGBToHex,
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
  gamutMapOKLCH,
  degToRad,
  OKHSLToOKLab,
  OKHSVToOKLab,
  OKLabToOKHSL,
  OKLabToOKHSV,
  XYZD65ToD50,
  XYZD50ToD65,
  XYZD50,
  ProPhotoRGB,
  ProPhotoRGBLinear,
  findCuspOKLCH,
  LMS_to_OKLab_M,
  DisplayP3,
  A98RGB,
  A98RGBLinear,
  XYZ_to_linear_A98RGB_M,
  DisplayP3Gamut,
  deserialize,
  parse,
} from "../src/index.js";

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
  const oklab = OKHSLToOKLab(okhsl, sRGBGamut);
  const expectedLABfromOKHSL = [
    0.568838198942395, 0.08553885335853362, 0.049385880012721296,
  ];
  t.deepEqual(oklab, expectedLABfromOKHSL);
  const okhslOut = OKLabToOKHSL(expectedLABfromOKHSL, sRGBGamut);
  t.deepEqual(okhslOut, okhsl);

  const okhsv = okhsl.slice();
  const expectedLABfromOKHSV = [
    0.45178419415172344, 0.0658295198906634, 0.03800669102949832,
  ];
  t.deepEqual(OKHSVToOKLab(okhsv, sRGBGamut), expectedLABfromOKHSV);
  t.deepEqual(
    arrayAlmostEqual(OKLabToOKHSV(expectedLABfromOKHSV, sRGBGamut), okhsv),
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
  const out2 = [0, 0];
  const cusp = findCuspOKLCH(aNorm, bNorm, sRGBGamut, out2);
  const hue30sRGBCusp = [0.6322837041534408, 0.2535829789121266];

  t.equal(out2, cusp);
  t.deepEqual(cusp, hue30sRGBCusp);

  const cuspP3 = findCuspOKLCH(aNorm, bNorm, DisplayP3Gamut, out2);
  const hue30P3Cusp = [0.6542359095783624, 0.2931937837912358];
  t.equal(out2, cuspP3);
  t.deepEqual(cuspP3, hue30P3Cusp);

  const l2 = 0.7;
  const c2 = 0.3;
  const newLCH = [l2, c2, H];
  const mapped = gamutMapOKLCH(newLCH, sRGBGamut, OKLCH);
  t.deepEqual(mapped, [0.679529110489262, 0.2093088779230169, 30]);
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
  t.deepEqual(serialize([1, 0, 0], OKLCH), "oklch(100% 0 0)");
  t.deepEqual(serialize([1, 0, 0], OKLab), "oklab(100% 0 0)");
  t.deepEqual(
    serialize([1, 0, 0, 0.4523], OKLCH, sRGB),
    "rgba(255, 255, 255, 0.4523)"
  );
  t.deepEqual(
    serialize([1, 0, 0, 0.4523], OKLCH, OKLCH),
    "oklch(100% 0 0 / 0.4523)"
  );
  t.deepEqual(serialize([1, 0, 0, 0.4523], OKLCH), "oklch(100% 0 0 / 0.4523)");
  t.deepEqual(
    serialize([1, 0, 0, 0.4523], DisplayP3),
    "color(display-p3 1 0 0 / 0.4523)"
  );
});

// not yet finished
// test("should parse to a color coord", async (t) => {
//   t.deepEqual(parse("rgb(0, 128, 255)", sRGB), [0, 128 / 0xff, 255 / 0xff]);
//   t.deepEqual(parse("rgba(0, 128, 255, .25)", sRGB), [
//     0,
//     128 / 0xff,
//     255 / 0xff,
//     0.25,
//   ]);
//   let outVec = [0, 0, 0];
//   t.deepEqual(parse("rgba(0, 128, 255, 1)", sRGB), [0, 128 / 0xff, 255 / 0xff]);
//   let out;
//   out = parse("rgba(0, 128, 255, 1)", sRGB, outVec);
//   t.deepEqual(out, [0, 128 / 0xff, 255 / 0xff]);
//   t.equal(out, outVec);

//   // trims to 3
//   outVec = [0, 0, 0, 0];
//   out = parse("rgba(0, 128, 255, 1)", sRGB, outVec);
//   t.deepEqual(out, [0, 128 / 0xff, 255 / 0xff]);
//   t.equal(out, outVec);

//   // ensures 4
//   outVec = [0, 0, 0, 0];
//   out = parse("rgba(0, 128, 255, 0.91)", sRGB, outVec);
//   t.deepEqual(out, [0, 128 / 0xff, 255 / 0xff, 0.91]);
//   t.equal(out, outVec);

//   t.deepEqual(
//     serialize(parse("oklch(1 0 0)", sRGB), sRGB),
//     "rgb(255, 255, 255)"
//   );
// });

test("should deserialize color string information", async (t) => {
  
  t.deepEqual(deserialize("rgb(0, 128, 255)"), {
    coords: [0, 128 / 0xff, 255 / 0xff],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgba(0, 128, 255)"), {
    coords: [0, 128 / 0xff, 255 / 0xff],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgba(0, 128, 255, 50%)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.5],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgb(0, 128, 255, 0.5)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.5],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgb(0 128 255)"), {
    coords: [0, 128 / 0xff, 255 / 0xff],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgb(0 128 255 / 0.5)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.5],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgb(0 128 255 / 50%)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.5],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgb(0 128 255 / 0.35)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.35],
    id: "srgb",
  });
  t.deepEqual(deserialize("RGBA(0 128 255 / 0.35)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.35],
    id: "srgb",
  });
  t.deepEqual(deserialize("rgba(0, 128, 255, 0.35)"), {
    coords: [0, 128 / 0xff, 255 / 0xff, 0.35],
    id: "srgb",
  });
  t.deepEqual(deserialize("#ff00cc"), {
    id: "srgb",
    coords: [1, 0, 0.8],
  });
  t.deepEqual(deserialize("#ff00cccc"), {
    id: "srgb",
    coords: [1, 0, 0.8, 0.8],
  });
  t.deepEqual(deserialize("COLOR(sRGB-Linear 0 0.5 1)"), {
    id: "srgb-linear",
    coords: [0, 0.5, 1],
  });
  t.deepEqual(deserialize("COLOR(sRGB-Linear 0 50% 1)"), {
    id: "srgb-linear",
    coords: [0, 0.5, 1],
  });
  t.deepEqual(deserialize("color(srgb-linear 0 0.5 1)"), {
    id: "srgb-linear",
    coords: [0, 0.5, 1],
  });
  t.deepEqual(deserialize("color(srgb-linear 0 0.5 1/0.25)"), {
    id: "srgb-linear",
    coords: [0, 0.5, 1, 0.25],
  });
  t.deepEqual(deserialize("color(srgb-linear 0 0.5 1 / 0.25)"), {
    id: "srgb-linear",
    coords: [0, 0.5, 1, 0.25],
  });
  t.deepEqual(deserialize("oklch(1 0 0)"), {
    id: "oklch",
    coords: [1, 0, 0],
  });
  t.deepEqual(deserialize("oklch(1 0 0/0.25)"), {
    id: "oklch",
    coords: [1, 0, 0, 0.25],
  });
});

test("utils", async (t) => {
  t.deepEqual(RGBToHex([0, 0.5, 1]), "#0080ff");
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
  const prophotoExpected = new Color("srgb", rgbin).to(
    "prophoto-linear"
  ).coords;
  t.deepEqual(arrayAlmostEqual(prophoto2, prophotoExpected), true);

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
});

test("should handle problematic coords", async (t) => {
  const in0 = [0.95, 1, 1.089];
  const out0 = convert(in0, XYZ, OKLab);
  const expected0lab = new Color("xyz", in0).to("oklab").coords;
  t.deepEqual(arrayAlmostEqual(out0, expected0lab), true);
  const inP3 = [0, 0, 1];
  const outXYZ = convert(inP3, DisplayP3, XYZ);
  t.deepEqual(
    arrayAlmostEqual(outXYZ, new Color("p3", inP3).to("xyz").coords),
    true
  );
  const outA98 = convert(outXYZ, XYZ, A98RGBLinear);
  t.deepEqual(
    arrayAlmostEqual(
      outA98,
      new Color("xyz", outXYZ).to("a98rgb-linear").coords
    ),
    true
  );

  // Failing test here, but it appears Colorjs does not match the latest
  // CSS spec (working draft with rational form). Please open a PR/issue if you
  // think you could help, but unless I'm mistaken it seems to be an upstream issue
  const tolerance = 0.0000001;
  t.deepEqual(
    arrayAlmostEqual(
      convert(inP3, DisplayP3, A98RGB),
      new Color("p3", inP3).to("a98rgb").coords,
      tolerance
    ),
    true
  );
});

function roundToNDecimals(value, digits) {
  var tenToN = 10 ** digits;
  return Math.round(value * tenToN) / tenToN;
}
