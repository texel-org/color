const canvasSketch = require("canvas-sketch");
import {
  convert,
  DisplayP3Gamut,
  gamutMapOKLCH,
  isRGBInGamut,
  MapToL,
  OKLCH,
  serialize,
  sRGBGamut,
} from "../src/index.js";
import { sLCH } from "./spaces/simple-ucs.js";

const settings = {
  duration: 10,
  fps: 12,
  playbackRate: "throttle",
  // animate: true,
  dimensions: [512, 512],
};

const sketch = ({ context }) => {
  const { colorSpace = "srgb" } = context.getContextAttributes();
  const gamut = colorSpace === "srgb" ? sRGBGamut : DisplayP3Gamut;
  const mapping = MapToL;
  const outputSpace = gamut.space;

  return ({ context, width, height, playhead }) => {
    context.fillStyle = "gray";
    context.fillRect(0, 0, width, height);

    // const theta = playhead * 360;

    // sLCH exhibits an unusual behavior in some blue hue planes
    // for example here, there is a 'slice' or 'gap' where it goes out of sRGB gamut
    const theta = 251.43;
    const inputSpace = sLCH;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;

        let lch;
        if (inputSpace.id === "slch") {
          const L = (1 - v) * 100;
          const C = u * 55;
          const H = theta;
          lch = [L, C, H];
        } else if (inputSpace.id === "oklch") {
          const L = 1 - v;
          const C = 0.35 * u;
          const H = theta;
          lch = [L, C, H];
        }
        const outRGB = convert(lch, inputSpace, outputSpace);
        if (isRGBInGamut(outRGB)) {
          const oklch = convert(lch, inputSpace, OKLCH);
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

    context.fillStyle = "white";
    const fontSize = height * 0.03;
    context.font = `${fontSize}px monospace`;
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.fillText(
      `${inputSpace.id == "slch" ? "sUCS" : "OKLab"} - ${theta.toFixed(2)}º`,
      width - fontSize,
      height - fontSize
    );
  };
};

canvasSketch(sketch, settings);
