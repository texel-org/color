const canvasSketch = require("canvas-sketch");
import {
  convert,
  degToRad,
  DisplayP3Gamut,
  gamutMapOKLCH,
  hexToRGB,
  isRGBInGamut,
  lerp,
  lerpAngle,
  MapToAdaptiveCuspL,
  MapToAdaptiveGray,
  MapToCuspL,
  MapToL,
  OKHSL,
  OKLab,
  OKLCH,
  radToDeg,
  serialize,
  sRGB,
  sRGBGamut,
  sRGBLinear,
} from "../src/index.js";
import { sLab, sLCH } from "./spaces/simple-ucs.js";
import { Lab } from "./spaces/lab.js";
import { OKLrab } from "./spaces/oklrab.js";

const settings = {
  dimensions: [500, 500],
};

const sketch = ({ context }) => {
  const { colorSpace = "srgb" } = context.getContextAttributes();
  const gamut = colorSpace === "srgb" ? sRGBGamut : DisplayP3Gamut;
  const mapping = MapToL;
  const outputSpace = gamut.space;

  return ({ context, width, height }) => {
    context.fillStyle = "gray";
    context.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;

        const L = 1 - v;
        const C = u * 0.4;
        const H = 90;

        const oklch = [L, C, H];
        const outRGB = convert(oklch, OKLCH, outputSpace);
        if (isRGBInGamut(outRGB)) {
          const mappedRGB = gamutMapOKLCH(
            oklch,
            gamut,
            outputSpace,
            undefined,
            mapping
          );
          context.fillStyle = serialize(mappedRGB, outputSpace);
          context.fillRect(x, y, 1, 1);
        }
      }
    }
  };
};

canvasSketch(sketch, settings);
