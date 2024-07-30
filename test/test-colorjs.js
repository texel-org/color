import test from "tape";
import Color from "colorjs.io";
import arrayAlmostEqual from "array-almost-equal";
import {
  convert,
  OKLab,
  OKLCH,
  sRGB,
  sRGBLinear,
  supportedColorSpaces,
  XYZ,
} from "../src/color/convert.js";

test("should approximately match colorjs.io conversions", async (t) => {
  // note: we skip okhsv/hsl as colorjs.io doesn't support in the current npm version
  const spaces = supportedColorSpaces().filter(
    (f) => !/ok(hsl|hsv)/i.test(f.id)
  );
  const vecs = [
    [0.12341, 0.12001, 0.05212],
    [1, 1, 1],
    [1, 0, 0],
    [0, 0, 0],
  ];
  for (let vec of vecs) {
    for (let i = 0; i < spaces.length; i++) {
      for (let j = 0; j < spaces.length; j++) {
        const a = spaces[i];
        const b = spaces[j];
        const suffix = `${a.id}-to-${b.id}`;

        console.log(suffix);
        const expected0 = convert(vec, a, b);
        const tmp = vec.slice();
        const expected1 = convert(vec, a, b, tmp);

        const colorjsid_a = a.id.replace("display-", "");
        const colorjsid_b = b.id.replace("display-", "");
        t.deepEqual(expected0, tmp, `${suffix} copies into`);
        t.deepEqual(expected0, expected1, `${suffix} copies into`);
        t.equal(expected1, tmp, `${suffix} copies into and returns`);

        // ColorJS returns NaN for display-p3 0 0 0 --> OKLCH
        const outCoords = new Color(colorjsid_a, vec)
          .to(colorjsid_b)
          .coords.map((n) => n || 0);

        if (!arrayAlmostEqual(expected0, outCoords)) {
          console.log(suffix, vec, expected0, outCoords);
          throw new Error("WTF");
        }
        t.equal(arrayAlmostEqual(expected0, outCoords), true, suffix);
      }
    }
  }
});
