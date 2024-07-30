import canvasSketch from "canvas-sketch";
import {
  findCusp,
  gamutMapOKLCH,
  GamutMapPreserveLightness,
  MapToAdaptiveCuspL,
  MapToAdaptiveGray,
  mapToGamutLcusp,
  MapToGray,
  sRGBGamut,
} from "../src/color/oklab-cusp.js";
import {
  convert,
  DisplayP3,
  OKLab,
  OKLCH,
  serialize,
  sRGB,
  sRGBLinear,
} from "../src/color/convert.js";
import {
  clippedRGB,
  floatToByte,
  isRGBInGamut,
  isRGBInGamutGBInGamut,
} from "../src/color/util.js";
import {
  LMS_to_linear_sRGB_M,
  OKLab_to_linear_sRGB_coefficients,
} from "../src/color/conversion_matrices.js";
import { clamp, degToRad } from "../src/math/util.js";

const settings = {
  dimensions: [2048, 2048],
};

const sketch = ({ width, height }) => {
  return ({ context, width, height }) => {
    const { colorSpace = "srgb" } = context.getContextAttributes();

    context.fillStyle = "gray";
    context.fillRect(0, 0, width, height);
    const H = 90;
    const hueAngle = degToRad(H);
    const a = Math.cos(hueAngle);
    const b = Math.sin(hueAngle);
    const cusp = findCusp(
      a,
      b,
      LMS_to_linear_sRGB_M,
      OKLab_to_linear_sRGB_coefficients
    );

    console.time("map");
    // console.profile("map");
    const tmp = [0, 0, 0];
    const pixels = new Uint8ClampedArray(width * height * 4).fill(0xff);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;
        const L = 1 - v;
        const C = 0.4 * u;

        const outputSpace = sRGB;
        const outputLinear = outputSpace.base;

        let oklch = [L, C, H];
        let rgbl = convert(oklch, OKLCH, outputLinear, tmp);
        if (!isRGBInGamut(rgbl, 0)) {
          rgbl[0] = 0.25;
          rgbl[1] = 0.25;
          rgbl[2] = 0.25;
        }

        convert(rgbl, outputLinear, outputSpace, tmp);
        const idx = x + y * width;
        pixels[idx * 4 + 0] = floatToByte(tmp[0]);
        pixels[idx * 4 + 1] = floatToByte(tmp[1]);
        pixels[idx * 4 + 2] = floatToByte(tmp[2]);
      }
    }
    context.putImageData(
      new ImageData(pixels, width, height, { colorSpace }),
      0,
      0
    );
    // console.profileEnd("map");
    console.timeEnd("map");

    const triangle = [[1, 0], cusp, [0, 0]];

    const lineWidth = width * 0.002;
    context.lineWidth = lineWidth;
    context.beginPath();
    triangle.forEach((oklch) => {
      const [x, y] = LCtoXY(oklch);
      context.lineTo(x, y);
    });
    context.closePath();
    context.strokeStyle = "white";
    context.stroke();

    const steps = 64;
    for (let i = 0; i < steps; i++) {
      const ox = 0.2;
      const oy = 0.3;
      const r = 0.4;
      const t = (i / steps) * degToRad(360) + degToRad(-180);

      const xy = [Math.cos(t) * r + ox, Math.sin(t) * r + oy];
      const [L, C] = UVtoLC(xy);
      const oklch = [L, C, H];
      drawLCPoint(context, oklch, (width * 0.01) / 2);

      const mappedLCH = oklch.slice();
      gamutMapOKLCH(oklch, sRGBGamut, OKLCH, mappedLCH);

      drawLCPoint(context, mappedLCH);

      context.beginPath();
      context.lineTo(...LCtoXY(oklch));
      context.lineTo(...LCtoXY(mappedLCH));
      context.stroke();
    }
  };

  function LCtoXY(okLC) {
    const x = (okLC[1] / 0.4) * width;
    const y = (1 - okLC[0]) * height;
    return [x, y];
  }

  function XYtoLC(xy) {
    return UVtoLC([xy[0] / width, xy[1] / height]);
  }

  function UVtoLC(xy) {
    const L = 1 - xy[1];
    const C = xy[0] * 0.4;
    return [L, C];
  }

  function drawLCPoint(context, okLC, radius = width * 0.01) {
    context.beginPath();
    context.arc(...LCtoXY(okLC), radius, 0, Math.PI * 2);
    context.fillStyle = "white";
    context.fill();
  }
};

canvasSketch(sketch, settings);
