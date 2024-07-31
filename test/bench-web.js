// import Color from "./colorjs-io.js";
import * as saido from "../src/color/convert.js";
const rgb = saido.convert([0.5, 0.15, 30], saido.OKLCH, saido.sRGB);
console.log(rgb);

// import { convert, OKLCH, sRGB } from "../src/color/convert.js";
// import { floatToByte, rgb_in_gamut } from "../src/color/util.js";

// 62.9kb
// console.log(new Color("oklch", [0.2, 0.2, 0.1]).to("srgb"));

// 3.4
// console.log(convert([0.2, 0.2, 0.1], OKLCH, sRGB));

// const size = 1024;
// const channels = 3;
// const image32f = new Float32Array(size * size * channels);
// for (let i = 0; i < size * size; i++) {
//   const x = i % size;
//   const y = Math.floor(i / size);
//   const u = x / size;
//   const v = y / size;

//   const L = 1 - v;
//   const C = u;
//   const H = 40;
//   image32f[i * channels + 0] = L;
//   image32f[i * channels + 1] = C;
//   image32f[i * channels + 2] = H;
// }

// function drawFast(context, pixels, size) {
//   const tmp3 = [0, 0, 0];
//   console.time("draw");
//   for (let i = 0; i < size * size; i++) {
//     const x = i % size;
//     const y = Math.floor(i / size);

//     tmp3[0] = image32f[i * channels + 0];
//     tmp3[1] = image32f[i * channels + 1];
//     tmp3[2] = image32f[i * channels + 2];
//     convert(tmp3, OKLCH, sRGB, tmp3);

//     if (rgb_in_gamut(tmp3, 0)) {
//       const R = floatToByte(tmp3[0]);
//       const G = floatToByte(tmp3[1]);
//       const B = floatToByte(tmp3[2]);
//       context.fillStyle = `rgb(${R}, ${G}, ${B})`;
//       context.fillRect(x, y, 1, 1);
//     }
//   }
//   console.timeEnd("draw");
// }

// function drawColorJS(context, pixels, size) {
//   const tmp3 = [0, 0, 0];
//   console.time("draw");
//   for (let i = 0; i < size * size; i++) {
//     const x = i % size;
//     const y = Math.floor(i / size);

//     tmp3[0] = image32f[i * channels + 0];
//     tmp3[1] = image32f[i * channels + 1];
//     tmp3[2] = image32f[i * channels + 2];

//     const coords = new Color("oklch", tmp3).to("srgb").coords;

//     if (rgb_in_gamut(coords, 0)) {
//       const R = floatToByte(coords[0]);
//       const G = floatToByte(coords[1]);
//       const B = floatToByte(coords[2]);
//       context.fillStyle = `rgb(${R}, ${G}, ${B})`;
//       context.fillRect(x, y, 1, 1);
//     }
//   }
//   console.timeEnd("draw");
// }

// function showLuma(pixels, size) {
//   const canvas = document.createElement("canvas");
//   const context = canvas.getContext("2d");
//   canvas.width = size;
//   canvas.height = size;
//   // drawFast(context, pixels, size);
//   drawColorJS(context, pixels, size);
//   document.body.appendChild(canvas);
//   canvas.style.width = "256px";
//   canvas.style.height = "auto";
// }

// showLuma(image32f, size);

// 3357 / 254
