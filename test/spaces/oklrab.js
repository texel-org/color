import { OKLab } from "../../src/index.js";

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1.0 + K1) / (1.0 + K2);

export const LToLr = (x) =>
  0.5 *
  (K3 * x - K1 + Math.sqrt((K3 * x - K1) * (K3 * x - K1) + 4 * K2 * K3 * x));

export const LrToL = (x) => (x ** 2 + K1 * x) / (K3 * (x + K2));

export const OKLrab = {
  id: "oklrab",
  base: OKLab,
  toBase: (oklrab, out = [0, 0, 0]) => {
    out[0] = LrToL(oklrab[0]);
    out[1] = oklrab[1];
    out[2] = oklrab[2];
    return out;
  },
  fromBase: (oklab, out = [0, 0, 0]) => {
    out[0] = LToLr(oklab[0]);
    out[1] = oklab[1];
    out[2] = oklab[2];
    return out;
  },
};
