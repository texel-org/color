const GAMUT_EPSILON = 0.000075;

export const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

export const lerp = (min, max, t) => min * (1 - t) + max * t;

export const degToRad = (n) => (n * Math.PI) / 180;

export const radToDeg = (n) => (n * 180) / Math.PI;

export const constrainAngle = (angle) => ((angle % 360) + 360) % 360;

export const hexToRGB = (str, out = vec3()) => {
  let hex = str.replace(/#/, "");
  if (hex.length === 3) {
    // expand shorthand
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  } else if (hex.length > 6) {
    // discard alpha
    hex = hex.slice(0, 6);
  }
  const rgb = parseInt(hex, 16);
  out[0] = ((rgb >> 16) & 0xff) / 0xff;
  out[1] = ((rgb >> 8) & 0xff) / 0xff;
  out[2] = (rgb & 0xff) / 0xff;
  return out;
};

export const RGBToHex = (rgb) =>
  `#${rgb.map((n) => floatToByte(n).toString(16).padStart(2, "0")).join("")}`;

/** @deprecated use RGBToHex */
export const RGBtoHex = RGBToHex;

export const isRGBInGamut = (lrgb, ep = GAMUT_EPSILON) => {
  const r = lrgb[0];
  const g = lrgb[1];
  const b = lrgb[2];
  return (
    r >= -ep &&
    r <= 1 + ep &&
    g >= -ep &&
    g <= 1 + ep &&
    b >= -ep &&
    b <= 1 + ep
  );
};

export const clampedRGB = (rgb, out = vec3()) => {
  out[0] = clamp(rgb[0], 0, 1);
  out[1] = clamp(rgb[1], 0, 1);
  out[2] = clamp(rgb[2], 0, 1);
  return out;
};

export const xyY_to_XYZ = (arg, out = vec3()) => {
  let X, Y, Z, x, y;
  x = arg[0];
  y = arg[1];
  Y = arg[2];
  if (y === 0) {
    out[0] = out[1] = out[2] = 0;
    return out;
  }
  X = (x * Y) / y;
  Z = ((1 - x - y) * Y) / y;
  out[0] = X;
  out[1] = Y;
  out[2] = Z;
  return out;
};

export const XYZ_to_xyY = (arg, out = vec3()) => {
  let sum, X, Y, Z;
  X = arg[0];
  Y = arg[1];
  Z = arg[2];
  sum = X + Y + Z;
  if (sum === 0) {
    out[0] = out[1] = 0;
    out[2] = Y;
    return out;
  }
  out[0] = X / sum;
  out[1] = Y / sum;
  out[2] = Y;
  return out;
};

export const floatToByte = (n) => clamp(Math.round(255 * n), 0, 255);

// Undocumented

export const vec3 = () => [0, 0, 0];

// export const normalizeHue = (hue) => ((hue = hue % 360) < 0 ? hue + 360 : hue);

// in degrees
// export const angle_delta = (angle1, angle2) => {
//   const diff = ((angle2 - angle1 + 180) % 360) - 180;
//   return diff < -180 ? diff + 360 : diff;
// };

// function shortAngleDistRad(a0, a1) {
//   var max = Math.PI * 2;
//   var da = (a1 - a0) % max;
//   return ((2 * da) % max) - da;
// }

export const deltaAngle = (a0, a1) => {
  var da = (a1 - a0) % 360;
  return ((2 * da) % 360) - da;
};

export const lerpAngle = (a0, a1, t) => a0 + deltaAngle(a0, a1) * t;
