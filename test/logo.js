import fs from "node:fs/promises";
import {
  ChunkType,
  ColorType,
  colorTypeToChannels,
  encode,
  encode_iCCP,
} from "png-tools";
import { deflate } from "pako";
import {
  convert,
  DisplayP3Gamut,
  floatToByte,
  hexToRGB,
  OKHSLToOKLab,
  OKLab,
  radToDeg,
} from "../src/index.js";

const gamut = DisplayP3Gamut;

// or regular sRGB...
// const gamut = sRGBGamut;

const isLogo = process.argv.includes("--logo");

const colorType = ColorType.RGB;
const channels = colorTypeToChannels(colorType);
const depth = 8;
const width = isLogo ? 512 : 1024;
const height = isLogo ? 512 : 512;
const uint8 = new Uint8ClampedArray(width * height * channels);

let rgb = [0, 0, 0];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const u = x / width;
    const v = y / height;

    if (isLogo) {
      const u2 = u * 2 - 1;
      const v2 = v * 2 - 1;
      const hueAngle = Math.atan2(v2, u2);
      let H = radToDeg(hueAngle);
      const hueSteps = 45 / 2;
      H = Math.round(H / hueSteps) * hueSteps;

      const S = 1;
      const L = 0.7;

      const oklab = OKHSLToOKLab([H, S, L], gamut);
      convert(oklab, OKLab, gamut.space, rgb);
    } else {
      const margin = 0.1 * Math.min(width, height);
      if (
        x >= margin &&
        y >= margin &&
        x < width - margin &&
        y < height - margin
      ) {
        const u2 = inverseLerp(margin, width - margin, x);
        const v2 = inverseLerp(margin, height - margin, y);
        const hueSteps = 8;
        const H = (Math.floor(u2 * hueSteps) / hueSteps) * 360;
        const satSteps = 4;
        const S = 1 - Math.floor(v2 * satSteps) / satSteps;
        const L = 0.75;
        const oklab = OKHSLToOKLab([H, S, L], gamut);
        convert(oklab, OKLab, gamut.space, rgb);
      } else {
        hexToRGB("#e9e3d5", rgb);
      }
    }

    const idx = x + y * width;
    const [r, g, b] = rgb.map((f) => floatToByte(f));
    uint8[idx * channels + 0] = r;
    uint8[idx * channels + 1] = g;
    uint8[idx * channels + 2] = b;
  }
}

// optional color profile chunk
let iCCP = null;
if (gamut == DisplayP3Gamut) {
  const iccFile = await fs.readFile("test/profiles/DisplayP3.icc");
  const name = "Display P3";
  const data = deflate(iccFile);
  iCCP = {
    type: ChunkType.iCCP,
    data: encode_iCCP({ name, data }),
  };
}

const png = encode(
  {
    width,
    height,
    data: uint8,
    colorType,
    depth,
    ancillary: [iCCP].filter(Boolean),
  },
  deflate
);

fs.writeFile(`test/${isLogo ? "logo" : "banner"}.png`, png);

function inverseLerp(min, max, t) {
  if (Math.abs(min - max) < Number.EPSILON) return 0;
  else return (t - min) / (max - min);
}
