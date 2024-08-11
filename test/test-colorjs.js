import test from "tape";
import Color from "colorjs.io";
import arrayAlmostEqual from "./almost-equal.js";
import { convert } from "../src/index.js";
import { getSupportedColorJSSpaces } from "./colorjs-fn.js";

test("should approximately match colorjs.io conversions", async (t) => {
  // note: we skip okhsv/hsl as colorjs.io doesn't support in the current npm version
  const spaces = getSupportedColorJSSpaces();
  const vecs = [
    [0.12341, 0.12001, 0.05212],
    [1, 1, 1],
    [1, 0, 0],
    [0, 0, 0],
    [-0.5, -0.5, -0.5],
    // some other inputs
    [0.95, 1, 1.089],
    [0.45, 1.236, -0.019],
    [0, 1, 0],
    [0.922, -0.671, 0.263],
    [0, 0, 1],
    [0.153, -1.415, -0.449],
  ];

  // just a further sanity check, uncomment to go wild
  // for (let i = 0; i < 100; i++)
  //   vecs.push([
  //     Math.random() * 2 - 1,
  //     Math.random() * 2 - 1,
  //     Math.random() * 2 - 1,
  //   ]);

  for (let vec of vecs) {
    for (let i = 0; i < spaces.length; i++) {
      for (let j = 0; j < spaces.length; j++) {
        const A = spaces[i];
        const B = spaces[j];

        // @texel/color spaces
        const a = A.space;
        const b = B.space;
        const suffix = `${a.id}-to-${b.id}`;

        console.log(suffix);
        const expected0 = convert(vec, a, b);
        const tmp = vec.slice();
        const expected1 = convert(vec, a, b, tmp);

        const colorjsid_a = A.colorJSSpace.id;
        const colorjsid_b = B.colorJSSpace.id;
        t.deepEqual(expected0, tmp, `${suffix} copies into`);
        t.deepEqual(expected0, expected1, `${suffix} copies into`);
        t.equal(expected1, tmp, `${suffix} copies into and returns`);

        // ColorJS returns NaN for display-p3 0 0 0 --> OKLCH
        const outCoords = new Color(colorjsid_a, vec)
          .to(colorjsid_b)
          .coords.map((n) => n || 0);

        // Colorjs does not appear to have as high precision as the latest
        // CSS working draft spec which uses rational numbers
        // so I have lowered tolerance for A98RGB, and consider it an upstream bug.
        // please open a PR/issue if you feel otherwise!
        const tolerance =
          colorjsid_a.includes("a98") || colorjsid_b.includes("a98")
            ? 0.0000001
            : undefined;

        if (!arrayAlmostEqual(expected0, outCoords, tolerance)) {
          console.error(
            `\nError: %s - In (%s) Out (%s) Expected (%s)`,
            suffix,
            vec,
            expected0,
            outCoords
          );
        }
        t.equal(
          arrayAlmostEqual(expected0, outCoords, tolerance),
          true,
          suffix
        );
      }
    }
  }
});
