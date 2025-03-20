import canvasSketch from "canvas-sketch";
import {
  convert,
  degToRad,
  DisplayP3Gamut,
  gamutMapOKLCH,
  hexToRGB,
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
  dimensions: [2048, 512],
  attributes: {
    // comment this out if you want sRGB output
    colorSpace: "display-p3",
  },
};

const mix = (() => {
  const tmpA = [0, 0, 0];
  const tmpB = [0, 0, 0];

  // e.g. mix({ space, coords }, { space, coords }, 0.5, sRGB)
  return (
    a,
    b,
    t,
    outputSpace = sRGB,
    interpolationSpace = OKLab,
    out = [0, 0, 0]
  ) => {
    // bring both spaces into the shared interpolation space
    convert(a.coords, a.space, interpolationSpace, tmpA);
    convert(b.coords, b.space, interpolationSpace, tmpB);

    // now do interpolation
    out[0] = lerp(tmpA[0], tmpB[0], t);
    out[1] = lerp(tmpA[1], tmpB[1], t);
    if (interpolationSpace.id === "oklch" || interpolationSpace.id === "slch") {
      // for cylindrical spaces, use a circular interpolation for Hue parameter
      // note if you decide to use a custom space like HSL as your interpolation space,
      // you'll have to use the first parameter instead...
      out[2] = lerpAngle(tmpA[2], tmpB[2], t);
    }
    // else if (interpolationSpace.id === "slch") {
    //   out[2] = degToRad(lerpAngle(radToDeg(tmpA[2]), radToDeg(tmpB[2]), t));
    // }
    else {
      // otherwise can use a regular linear interpolation
      out[2] = lerp(tmpA[2], tmpB[2], t);
    }

    // make sure we convert from interpolation space to the target output space
    convert(out, interpolationSpace, outputSpace, out);
    return out;
  };
})();

// utility to create a ramp between two 'colors' as { space, coords }
function ramp(a, b, steps = 4, outputSpace = sRGB, interpolationSpace = OKLab) {
  return Array(steps)
    .fill()
    .map((_, i, lst) => {
      const t = lst.length <= 1 ? 0 : i / (lst.length - 1);
      return mix(a, b, t, outputSpace, interpolationSpace);
    });
}

const sketch = ({ context }) => {
  const { colorSpace = "srgb" } = context.getContextAttributes();
  const gamut = colorSpace === "srgb" ? sRGBGamut : DisplayP3Gamut;
  const mapping = MapToL;

  return ({ context, width, height }) => {
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);

    const A = {
      space: sRGB,
      coords: [1, 1, 1],
    };

    const B = {
      space: sRGB,
      coords: [0, 0, 1],
    };
    // const A = {
    //   space: sRGB,
    //   coords: [Math.random(), Math.random(), Math.random()],
    // };
    // console.log(A.coords.map((n) => n.toFixed(2)));

    // const B = {
    //   space: sLab,
    //   coords: convert([100, 0.75, 0.5], OKHSL, sLab),
    // };

    // const B = {
    //   space: OKLab,
    //   coords: [0.75, 0.05, 0.1],
    // };
    // console.log(convert(B.coords, OKLab, sRGB));

    // const B = {
    //   space: sRGB,
    //   coords: [Math.random(), Math.random(), Math.random()],
    // };
    // console.log(B.coords.map((n) => n.toFixed(2)));

    const slices = width;
    const sliceWidth = width / slices;

    // the output space is whatever the canvas expects (sRGB or DisplayP3)
    const outputSpace = gamut.space;
    const types = [
      { ramp: OKLCH },
      { ramp: sLCH },
      // { ramp: OKLab },
      // { ramp: OKLrab },
      // { ramp: sLab },
      // { ramp: Lab },
      // { hue: OKLCH },
      // { hue: sLCH },
    ];
    for (let j = 0; j < types.length; j++) {
      const type = types[j];
      const space = type.ramp ? type.ramp : type.hue;
      const isRamp = type.ramp;

      const typeHeight = Math.ceil(height / types.length);
      if (isRamp) {
        // create a ramp of colors in OKLCH
        // then gamut map them to the outputSpace
        const colors = ramp(A, B, slices, OKLCH, space).map((oklch) =>
          gamutMapOKLCH(oklch, gamut, outputSpace, undefined, mapping)
        );

        for (let i = 0; i < slices; i++) {
          const color = colors[i];

          // turn the color (now in outputSpace) into a context string
          context.fillStyle = serialize(color, outputSpace);
          context.fillRect(
            i * sliceWidth,
            typeHeight * j,
            sliceWidth,
            typeHeight
          );
        }
      } else if (type.hue) {
        for (let i = 0; i < slices; i++) {
          const t = i / slices;
          const theta = t * Math.PI * 2;
          const okL = 0.75;
          const okC = 0.4;
          let oklch = [okL, okC, radToDeg(theta)];

          if (space.id === "oklch") {
            // pass
          } else if (space.id === "slch") {
            // let oklchMapped = gamutMapOKLCH(
            //   oklch,
            //   gamut,
            //   OKLCH,
            //   undefined,
            //   mapping
            // );
            // convert OKLC (mapped to gamut) to SLC
            // const [sL, sC] = convert(oklchMapped, OKLCH, sLCH);

            // use constant L and C planes for sLCH
            const sL = 68;
            const sC = 47;
            const slch = [sL, sC, radToDeg(theta)];
            oklch = convert(slch, sLCH, OKLCH);
          } else {
            continue;
          }
          const color = gamutMapOKLCH(
            oklch,
            gamut,
            outputSpace,
            undefined,
            mapping
          );
          context.fillStyle = serialize(color, outputSpace);
          context.fillRect(
            i * sliceWidth,
            typeHeight * j,
            sliceWidth,
            typeHeight
          );
        }
      }
      if (space) {
        context.fillStyle = "black";
        context.font = `${typeHeight * 0.25}px monospace`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillText(
          space.id,
          typeHeight * 0.25,
          typeHeight * j + typeHeight / 2
        );
      }
    }
  };
};

canvasSketch(sketch, settings);
