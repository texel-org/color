import canvasSketch from "canvas-sketch";
import {
  findCuspOKLCH,
  gamutMapOKLCH,
  MapToAdaptiveCuspL,
  A98RGBGamut,
  convert,
  DisplayP3Gamut,
  OKLCH,
  Rec2020Gamut,
  sRGBGamut,
  degToRad,
  constrainAngle,
  floatToByte,
  isRGBInGamut,
  clampedRGB,
} from "../src/index.js";
import arrayAlmostEqual from "./almost-equal.js";

const settings = {
  dimensions: [768, 768],
  animate: false,
  playbackRate: "throttle",
  fps: 2,
  attributes: {
    colorSpace: "display-p3",
  },
};

const sketch = ({ width, height }) => {
  return ({ context, width, height, frame, playhead }) => {
    const { colorSpace = "srgb" } = context.getContextAttributes();
    const gamut = colorSpace === "srgb" ? sRGBGamut : DisplayP3Gamut;
    const mapping = MapToAdaptiveCuspL;

    context.fillStyle = "gray";
    context.fillRect(0, 0, width, height);
    const H = 264.1;
    // const H = constrainAngle((frame * 45) / 2);

    // console.time("map");
    // console.profile("map");
    const tmp = [0, 0, 0];
    const pixels = new Uint8ClampedArray(width * height * 4).fill(0xff);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const v = y / height;

        const [L, C] = UVtoLC([u, v]);

        let oklch = [L, C, H];
        let rgb = convert(oklch, OKLCH, gamut.space, tmp);
        if (!isRGBInGamut(rgb, 0)) {
          rgb[0] = 0.25;
          rgb[1] = 0.25;
          rgb[2] = 0.25;
          // if we wanted to fill the whole space with mapped colors
          // rgb = gamutMapOKLCH(oklch, gamut, sRGB, tmp, mapping);
        }

        const idx = x + y * width;
        pixels[idx * 4 + 0] = floatToByte(rgb[0]);
        pixels[idx * 4 + 1] = floatToByte(rgb[1]);
        pixels[idx * 4 + 2] = floatToByte(rgb[2]);
      }
    }
    context.putImageData(
      new ImageData(pixels, width, height, { colorSpace }),
      0,
      0
    );
    // console.profileEnd("map");
    // console.timeEnd("map");

    const A = [1, 0];
    const B = [0, 0];
    const lineWidth = width * 0.003;
    context.lineWidth = lineWidth;

    const gamuts = [
      { defaultColor: "yellow", gamut: sRGBGamut },
      { defaultColor: "palegreen", gamut: DisplayP3Gamut },
      { defaultColor: "red", gamut: Rec2020Gamut },
      { defaultColor: "pink", gamut: A98RGBGamut },
    ];

    const hueAngle = degToRad(H);
    const a = Math.cos(hueAngle);
    const b = Math.sin(hueAngle);

    for (let { gamut: dispGamut, defaultColor } of gamuts) {
      const gamutCusp = findCuspOKLCH(a, b, dispGamut);
      const gamutTri = [A, gamutCusp, B];
      drawLCTriangle(
        context,
        gamutTri,
        gamut === dispGamut ? "white" : defaultColor
      );
    }

    context.strokeStyle = "white";

    const steps = 64;
    for (let i = 0; i < steps; i++) {
      // get some LC point that is very likely to be out of gamut
      const ox = 0.5;
      const oy = 0.5;
      const r = 1;
      const t = (i / steps) * degToRad(360) + degToRad(-180);
      const xy = [Math.cos(t) * r + ox, Math.sin(t) * r + oy];
      const [L, C] = UVtoLC(xy);
      const oklch = [L, C, H];
      const lc = oklch.slice(0, 2);

      const mapped = gamutMapOKLCH(oklch, gamut, OKLCH, tmp, mapping);

      const radius = width * 0.01;
      const didChange = !arrayAlmostEqual(mapped, oklch);
      if (didChange) {
        context.globalAlpha = 0.5;
        drawLCPoint(context, lc, radius / 2, "white");
        context.beginPath();
        context.lineTo(...LCtoXY(lc));
        context.lineTo(...LCtoXY(mapped));
        context.stroke();
        context.globalAlpha = 1;
        drawLCPoint(context, mapped.slice(0, 2), radius / 4, "white");
      } else {
        drawLCPoint(context, lc, radius);
      }
    }

    const fontSize = width * 0.03;
    const boxHeight = fontSize * gamuts.length;
    const pad = width * 0.05;
    const padleft = width * 0.1;
    context.fillStyle = "black";

    for (let i = 0; i < gamuts.length; i++) {
      const { gamut: dispGamut, defaultColor } = gamuts[i];
      const curColor = dispGamut === gamut ? "white" : defaultColor;

      context.font = `${fontSize}px monospace`;
      context.textAlign = "right";
      context.textBaseline = "top";
      context.fillStyle = curColor;
      const x = width - pad - padleft;
      const y = height - boxHeight + i * fontSize - pad;
      context.fillText(dispGamut.space.id, x, y);
      context.beginPath();
      context.lineTo(x + fontSize / 2, y + fontSize * 0.4);
      context.lineTo(x + padleft, y + fontSize * 0.4);
      context.strokeStyle = curColor;
      context.stroke();
    }

    context.fillStyle = "white";
    context.fillText(
      `Hue: ${H.toFixed(0)}º`,
      width - pad,
      height - pad - boxHeight - fontSize * 2
    );
  };

  function LCtoXY(okLC) {
    const x = (okLC[1] / 1) * width;
    const y = (1 - okLC[0]) * height;
    return [x, y];
  }

  function XYtoLC(xy) {
    return UVtoLC([xy[0] / width, xy[1] / height]);
  }

  function UVtoLC(xy) {
    const L = 1 - xy[1];
    const C = xy[0] * 1;
    return [L, C];
  }

  function drawLCTriangle(context, triangle, color = "white") {
    context.beginPath();
    triangle.forEach((oklch) => {
      const [x, y] = LCtoXY(oklch);
      context.lineTo(x, y);
    });
    context.closePath();
    context.strokeStyle = color;
    context.stroke();
  }

  function drawLCPoint(
    context,
    okLC,
    radius = width * 0.01,
    color = "white",
    fill = true
  ) {
    context.beginPath();
    context.arc(...LCtoXY(okLC), radius, 0, Math.PI * 2);
    if (fill) {
      context.fillStyle = color;
      context.fill();
    } else {
      context.strokeStyle = color;
      context.stroke();
    }
  }
};

canvasSketch(sketch, settings);
