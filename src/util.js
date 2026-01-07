/**
 * Clamps a value between a minimum and maximum value.
 * @method
 * @param {number} value The value to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} The clamped value.
 * @category utils
 */
export const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

/**
 * Linearly interpolates between two values.
 * @method
 * @param {number} min The start value.
 * @param {number} max The end value.
 * @param {number} t The interpolation factor between 0 and 1.
 * @returns {number} The interpolated value.
 * @category utils
 */
export const lerp = (min, max, t) => min * (1 - t) + max * t;

/**
 * Converts degrees to radians.
 * @method
 * @param {number} n The angle in degrees.
 * @returns {number} The angle in radians.
 * @category utils
 */
export const degToRad = (n) => (n * Math.PI) / 180;

/**
 * Converts radians to degrees.
 * @method
 * @param {number} n The angle in radians.
 * @returns {number} The angle in degrees.
 * @category utils
 */
export const radToDeg = (n) => (n * 180) / Math.PI;

/**
 * Constrains an angle to the range [0, 360).
 * @method
 * @param {number} angle The angle in degrees.
 * @returns {number} The constrained angle.
 * @category utils
 */
export const constrainAngle = (angle) => ((angle % 360) + 360) % 360;

/**
 * Converts a hex color string to an RGB array.
 * @method
 * @param {string} str The hex color string.
 * @param {Vector} [out=vec3()] The output array.
 * @returns {Vector} The RGB array.
 * @category rgb
 */
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

/**
 * Converts an RGB array to a hex color string.
 * @method
 * @param {Vector} rgb The RGB array.
 * @returns {string} The hex color string.
 * @category rgb
 */
export const RGBToHex = (rgb) =>
  `#${rgb.map((n) => floatToByte(n).toString(16).padStart(2, "0")).join("")}`;

/**
 * @method
 * @deprecated Use RGBToHex instead.
 * @param {Vector} rgb The RGB array.
 * @returns {string} The hex color string.
 * @category rgb
 */
export const RGBtoHex = RGBToHex;

/**
 * Checks if an RGB color is within the gamut.
 * @method
 * @param {Vector} lrgb The linear RGB array.
 * @param {number} [ep=0] The epsilon value for comparison.
 * @returns {boolean} True if the color is within the gamut, false otherwise.
 * @category rgb
 */
export const isRGBInGamut = (lrgb, ep = 0) => {
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

/**
 * Clamps an RGB array to the range [0, 1].
 * @method
 * @param {Vector} rgb The RGB array.
 * @param {Vector} [out=vec3()] The output array.
 * @returns {Vector} The clamped RGB array.
 * @category rgb
 */
export const clampedRGB = (rgb, out = vec3()) => {
  out[0] = clamp(rgb[0], 0, 1);
  out[1] = clamp(rgb[1], 0, 1);
  out[2] = clamp(rgb[2], 0, 1);
  return out;
};

/**
 * Converts xyY color space to XYZ color space.
 * @method
 * @param {Vector} arg The xyY array.
 * @param {Vector} [out=vec3()] The output array.
 * @returns {Vector} The XYZ array.
 * @category xyz
 */
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

/**
 * Converts XYZ color space to xyY color space.
 * @method
 * @param {Vector} arg The XYZ array.
 * @param {Vector} [out=vec3()] The output array.
 * @returns {Vector} The xyY array.
 * @category xyz
 */
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

/**
 * Converts a float value to a byte value.
 * @method
 * @param {number} n The float value.
 * @returns {number} The byte value.
 * @category utils
 */
export const floatToByte = (n) => clamp(Math.round(255 * n), 0, 255);

/**
 * Creates a new vec3 array.
 * @method
 * @returns {Vector} The vec3 array.
 * @category utils
 */
export const vec3 = () => [0, 0, 0];

/**
 * Calculates the delta angle between two angles.
 * @method
 * @param {number} a0 The first angle in degrees.
 * @param {number} a1 The second angle in degrees.
 * @returns {number} The delta angle in degrees.
 * @category utils
 */
export const deltaAngle = (a0, a1) => {
  var da = (a1 - a0) % 360;
  return ((2 * da) % 360) - da;
};

/**
 * Linearly interpolates between two angles.
 * @method
 * @param {number} a0 The start angle in degrees.
 * @param {number} a1 The end angle in degrees.
 * @param {number} t The interpolation factor between 0 and 1.
 * @returns {number} The interpolated angle in degrees.
 * @category utils
 */
export const lerpAngle = (a0, a1, t) => a0 + deltaAngle(a0, a1) * t;
