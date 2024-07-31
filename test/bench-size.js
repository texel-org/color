import * as saido from "../src/color/convert.js";
const rgb = saido.convert([0.5, 0.15, 30], saido.OKLCH, saido.sRGB);
console.log(rgb);
