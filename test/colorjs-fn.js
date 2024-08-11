import * as ColorJSFn from "colorjs.io/fn";
import { listColorSpaces } from "../src/index.js";

// Colorjs.io uses some different naming conventions than @texel/color
const getColorJSID = (name) => {
  return name
    .replace("display-", "")
    .replace(/^xyz$/, "xyz-d65")
    .replace("a98-rgb", "a98rgb")
    .replace("prophoto-rgb", "prophoto");
};

// returns a list of ColorJS.io space IDs that are supported by @texel/color
// okhsl/okhsv is skipped due to it not being included in this npm version of colorjs.io
export function getSupportedColorJSSpaces() {
  const spaceFns = Object.values(ColorJSFn);
  const spaces = listColorSpaces().filter((s) => !/ok(hsv|hsl)/i.test(s.id));
  return spaces.map((space) => {
    const cjsID = getColorJSID(space.id);
    const colorJSSpace = spaceFns.find((f) => f.id === cjsID);
    if (!colorJSSpace)
      throw new Error(`expected ${cjsID} to exist in colorjs.io/fn`);
    return {
      space,
      colorJSSpace,
    };
  });
}

// Register all spaces
const spaces = getSupportedColorJSSpaces().map((s) => s.colorJSSpace);
for (let space of spaces) {
  ColorJSFn.ColorSpace.register(space);
}
