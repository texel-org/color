import canvasSketch from "canvas-sketch";
import {
  convert,
  DisplayP3Gamut,
  gamutMapOKLCH,
  lerp,
  lerpAngle,
  OKLab,
  OKLCH,
  serialize,
  sRGB,
  sRGBGamut,
} from "../src/index.js";

const settings = {
  dimensions: [2048, 512],
  attributes: {
    // comment this out if you want sRGB output
    colorSpace: "display-p3",
  },
};

const mix = (() => {
  const tmpA = [0, 0, 0];
  const tmpB = [0, 0, 0];

  // you can decide whether you'd like to interpolate in
  // OKLab, OKLCH or another space (you may need to adjust interpolation
  // if you use a custom space)
  const interpolationSpace = OKLCH;

  // e.g. mix({ space, coords }, { space, coords }, 0.5, sRGB)
  return (a, b, t, outputSpace = sRGB, out = [0, 0, 0]) => {
    // bring both spaces into the shared interpolation space
    convert(a.coords, a.space, interpolationSpace, tmpA);
    convert(b.coords, b.space, interpolationSpace, tmpB);

    // now do interpolation
    out[0] = lerp(tmpA[0], tmpB[0], t);
    out[1] = lerp(tmpA[1], tmpB[1], t);
    if (interpolationSpace.id === "oklch") {
      // for cylindrical spaces, use a circular interpolation for Hue parameter
      // note if you decide to use a custom space like HSL as your interpolation space,
      // you'll have to use the first parameter instead...
      out[2] = lerpAngle(tmpA[2], tmpB[2], t);
    } else {
      // otherwise can use a regular linear interpolation
      out[2] = lerp(tmpA[2], tmpB[2], t);
    }

    // make sure we convert from interpolation space to the target output space
    convert(out, interpolationSpace, outputSpace, out);
    return out;
  };
})();

// utility to create a ramp between two 'colors' as { space, coords }
function ramp(a, b, steps = 4, outputSpace = sRGB) {
  return Array(steps)
    .fill()
    .map((_, i, lst) => {
      const t = lst.length <= 1 ? 0 : i / (lst.length - 1);
      return mix(a, b, t, outputSpace);
    });
}

const sketch = ({ context }) => {
  const { colorSpace = "srgb" } = context.getContextAttributes();
  const gamut = colorSpace === "srgb" ? sRGBGamut : DisplayP3Gamut;

  return ({ context, width, height }) => {
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    const A = {
      space: sRGB,
      coords: [0, 0, 1],
    };

    const B = {
      space: OKLCH,
      coords: [0.55, 0.4, 30],
    };

    const slices = 16;
    const sliceWidth = width / slices;

    // the output space is whatever the canvas expects (sRGB or DisplayP3)
    const outputSpace = gamut.space;

    // create a ramp of colors in OKLCH
    // then gamut map them to the outputSpace
    const colors = ramp(A, B, slices, OKLCH).map((oklch) =>
      gamutMapOKLCH(oklch, gamut, outputSpace)
    );

    for (let i = 0; i < slices; i++) {
      const color = colors[i];

      // turn the color (now in outputSpace) into a context string
      context.fillStyle = serialize(color, outputSpace);
      context.fillRect(i * sliceWidth, 0, sliceWidth, height);
    }
  };
};

canvasSketch(sketch, settings);
