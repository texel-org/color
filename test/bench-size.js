// To test @texel/color (~3.5 kb)
import * as colors from "../src/index.js";
const rgb = colors.convert([0.5, 0.15, 30], colors.OKLCH, colors.sRGB);
console.log(rgb);

// To test colorjs.io (~55.3 kb)
// import Color from "colorjs.io";
// console.log(new Color("oklch", [0.5, 0.15, 30]).to("srgb").coords);

// To test Culori (~43.2 kb)
// import { rgb } from "culori";
// console.log(rgb({ mode: "oklch", l: 0.5, c: 0.15, h: 30 }));
