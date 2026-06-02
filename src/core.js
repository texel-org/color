import { clamp, floatToByte, hexToRGB, vec3 } from "./util.js";
import { LMS_to_OKLab_M, OKLab_to_LMS_M } from "./conversion_matrices.js";
import { listColorSpaces, sRGB, XYZ } from "./spaces.js";

/**
 * @typedef {number[][]} Matrix3x3
 * @description A 3x3 matrix represented as an array of arrays.
 * @example
 * const matrix = [
 *   [a, b, c],
 *   [d, e, f],
 *   [g, h, i]
 * ];
 */

/**
 * @typedef {number[]} Vector
 * @description A n-dimensional vector represented as an array of numbers, typically in 3D (X, Y, Z).
 * @example
 * const vec = [ x, y, z ];
 */

/**
 * @typedef {number[][][]} ColorGamutCoefficients
 */

/**
 * @typedef {Object} ChromaticAdaptation
 * @property {Matrix3x3} from the matrix to convert from the source whitepoint to the destination whitepoint
 * @property {Matrix3x3} to the matrix to convert from the destination whitepoint to the source whitepoint
 */

/**
 * @typedef {Object} ColorSpace
 * @property {String} id the unique identifier for this color space in lowercase
 * @property {Matrix3x3} [toXYZ_M] optional matrix to convert this color directly to XYZ D65
 * @property {Matrix3x3} [fromXYZ_M] optional matrix to convert XYZ D65 to this color space
 * @property {Matrix3x3} [toLMS_M] optional matrix to convert this color space to OKLab's LMS intermediary form
 * @property {Matrix3x3} [fromLMS_M] optional matrix to convert OKLab's LMS intermediary form to this color space
 * @property {ChromaticAdaptation} [adapt] optional chromatic adaptation matrices
 * @property {ColorSpace} [base] an optional base color space that this space is derived from
 * @property {function} [toBase] if a base color space exists, this maps the color to the base space form (e.g. gamma to the linear base space)
 * @property {function} [fromBase] if a base color space exists, this maps the color from the base space form (e.g. the linear base space to the gamma space)
 */

/**
 * @typedef {Object} ColorGamut
 * @property {ColorSpace} space the color space associated with this color gamut
 * @property {ColorGamutCoefficients} [coefficients] the coefficients used during gamut mapping from OKLab
 */

const tmp3 = vec3();

const cubed3 = (lms) => {
  const l = lms[0],
    m = lms[1],
    s = lms[2];
  lms[0] = l * l * l;
  lms[1] = m * m * m;
  lms[2] = s * s * s;
};

const cbrt3 = (lms) => {
  lms[0] = Math.cbrt(lms[0]);
  lms[1] = Math.cbrt(lms[1]);
  lms[2] = Math.cbrt(lms[2]);
};

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Converts OKLab color to another color space.
 * @param {Vector} OKLab The OKLab color.
 * @param {Matrix3x3} LMS_to_output The transformation matrix from LMS to the output color space.
 * @param {Vector} [out=vec3()] The output vector.
 * @returns {Vector} The transformed color.
 * @method
 * @category oklab
 */
export const OKLab_to = (OKLab, LMS_to_output, out = vec3()) => {
  transform(OKLab, OKLab_to_LMS_M, out);
  cubed3(out);
  return transform(out, LMS_to_output, out);
};

/**
 * Converts a color from another color space to OKLab.
 * @param {Vector} input The input color.
 * @param {Matrix3x3} input_to_LMS The transformation matrix from the input color space to LMS.
 * @param {Vector} [out=vec3()] The output vector.
 * @returns {Vector} The transformed color.
 * @method
 * @category oklab
 */
export const OKLab_from = (input, input_to_LMS, out = vec3()) => {
  transform(input, input_to_LMS, out);
  cbrt3(out);
  return transform(out, LMS_to_OKLab_M, out);
};

/**
 * Transforms a color vector by the specified 3x3 transformation matrix.
 * @param {Vector} input The input color.
 * @param {Matrix3x3} matrix The transformation matrix.
 * @param {Vector} [out=vec3()] The output vector.
 * @returns {Vector} The transformed color.
 * @method
 * @category core
 */
export const transform = (input, matrix, out = vec3()) => {
  const x = dot3(input, matrix[0]);
  const y = dot3(input, matrix[1]);
  const z = dot3(input, matrix[2]);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
};

const vec3Copy = (input, output) => {
  output[0] = input[0];
  output[1] = input[1];
  output[2] = input[2];
};

/**
 * Serializes a color to a CSS color string.
 * @param {Vector} input The input color.
 * @param {ColorSpace} inputSpace The input color space.
 * @param {ColorSpace} [outputSpace=inputSpace] The output color space.
 * @returns {string} The serialized color string.
 * @method
 * @category core
 */
export const serialize = (input, inputSpace, outputSpace = inputSpace) => {
  if (!inputSpace) throw new Error(`must specify an input space`);
  // extract alpha if present
  let alpha = 1;
  if (input.length > 3) {
    alpha = input[3];
  }
  // copy into temp
  vec3Copy(input, tmp3);
  // convert if needed
  if (inputSpace !== outputSpace) {
    convert(input, inputSpace, outputSpace, tmp3);
  }
  const id = outputSpace.id;
  if (id === "srgb") {
    // uses the legacy rgb() format
    const r = floatToByte(tmp3[0]);
    const g = floatToByte(tmp3[1]);
    const b = floatToByte(tmp3[2]);
    const rgb = `${r}, ${g}, ${b}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${alpha})`;
  } else {
    const alphaSuffix = alpha === 1 ? "" : ` / ${alpha}`;
    if (id === "oklab" || id === "oklch") {
      // older versions of Safari don't support oklch with 0..1 L but do support %
      return `${id}(${tmp3[0] * 100}% ${tmp3[1]} ${tmp3[2]}${alphaSuffix})`;
    } else {
      return `color(${id} ${tmp3[0]} ${tmp3[1]} ${tmp3[2]}${alphaSuffix})`;
    }
  }
};

const stripAlpha = (coords) => {
  if (coords.length >= 4 && coords[3] === 1) return coords.slice(0, 3);
  return coords;
};

const parseFloatValue = (str) => parseFloat(str) || 0;

const parseColorValue = (str, is255 = false) => {
  if (is255) return clamp(parseFloatValue(str) / 0xff, 0, 0xff);
  else
    return str.includes("%")
      ? parseFloatValue(str) / 100
      : parseFloatValue(str);
};

/**
 * Deserializes a color string to an object with <code>id</code> (color space string) and <code>coords</code> (the vector, in 3 or 4 dimensions).
 * Note this does not return a <code>ColorSpace</code> object; you may want to use the example code below to map the string ID to a <code>ColorSpace</code>, but this will increase the size of your final bundle as it references all spaces.
 *
 * @example
 * import { listColorSpaces, deserialize } from "@texel/color";
 *
 * const { id, coords } = deserialize(str);
 * // now find the actual color space object
 * const space = listColorSpaces().find((f) => id === f.id);
 * console.log(space, coords);
 *
 * @param {string} input The color string to deserialize.
 * @returns {{id: string, coords: Vector}} The deserialized color object.
 * @method
 * @category core
 */
export const deserialize = (input) => {
  if (typeof input !== "string") {
    throw new Error(`expected a string as input`);
  }
  input = input.trim();
  if (input.charAt(0) === "#") {
    const rgbIn = input.slice(0, 7);
    let alphaByte = input.length > 7 ? parseInt(input.slice(7, 9), 16) : 255;
    let alpha = isNaN(alphaByte) ? 1 : alphaByte / 255;
    const coords = hexToRGB(rgbIn);
    if (alpha !== 1) coords.push(alpha);
    return {
      id: "srgb",
      coords,
    };
  } else {
    const parts = /^(rgb|rgba|oklab|oklch|color)\((.+)\)$/i.exec(input);
    if (!parts) {
      throw new Error(`could not parse color string ${input}`);
    }
    const fn = parts[1].toLowerCase();
    if (/^rgba?$/i.test(fn) && parts[2].includes(",")) {
      const coords = parts[2].split(",").map((v, i) => {
        return parseColorValue(v.trim(), i < 3);
      });
      return {
        id: "srgb",
        coords: stripAlpha(coords),
      };
    } else {
      let id, coordsStrings;
      let div255 = false;

      if (/^color$/i.test(fn)) {
        const params =
          /([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s/]+)(?:\s?\/\s?([^\s]+))?/.exec(
            parts[2]
          );
        if (!params)
          throw new Error(`could not parse color() function ${input}`);
        id = params[1].toLowerCase();
        coordsStrings = params.slice(2, 6);
      } else {
        if (/^(oklab|oklch)$/i.test(fn)) {
          id = fn;
        } else if (/rgba?/i.test(fn)) {
          id = "srgb";
          div255 = true;
        } else {
          throw new Error(`unknown color function ${fn}`);
        }
        const params =
          /([^\s]+)\s+([^\s]+)\s+([^\s/]+)(?:\s?\/\s?([^\s]+))?/.exec(parts[2]);
        if (!params)
          throw new Error(`could not parse color() function ${input}`);
        coordsStrings = params.slice(1, 6);
      }

      if (coordsStrings[3] == null) {
        coordsStrings = coordsStrings.slice(0, 3);
      }

      const coords = coordsStrings.map((f, i) => {
        return parseColorValue(f.trim(), div255 && i < 3);
      });
      if (coords.length < 3 || coords.length > 4)
        throw new Error(`invalid number of coordinates`);
      return {
        id,
        coords: stripAlpha(coords),
      };
    }
  }
};

/**
 * Parses a color string and converts it to the target color space.
 * @param {string} input The color string to parse.
 * @param {ColorSpace} targetSpace The target color space.
 * @param {Vector} [out=vec3()] The output vector.
 * @returns {Vector} The parsed and converted color.
 * @method
 * @category core
 */
// lazily-built id -> ColorSpace lookup for parse(); built once on first use
// so the common conversion paths still tree-shake the full space list away
let spaceByIdMap;
const spaceById = () =>
  spaceByIdMap ??
  (spaceByIdMap = new Map(listColorSpaces().map((s) => [s.id, s])));

export const parse = (input, targetSpace, out = vec3()) => {
  if (!targetSpace)
    throw new Error(`must specify a target space to parse into`);

  const { coords, id } = deserialize(input);
  const space = spaceById().get(id);
  if (!space) throw new Error(`could not find space with the id ${id}`);
  const alpha = coords.length === 4 ? coords[3] : 1;

  // copy 3D coords to output and convert
  vec3Copy(coords, out);
  convert(out, space, targetSpace, out);

  // store alpha
  if (alpha !== 1) out[3] = alpha;
  // reduce to 3D
  if (alpha === 1 && out.length === 4) out.pop();
  return out;
};

/**
 * Converts a color from one color space to another.
 * @param {Vector} input The input color.
 * @param {ColorSpace} fromSpace The source color space.
 * @param {ColorSpace} toSpace The target color space.
 * @param {Vector} [out=vec3()] The output vector.
 * @returns {Vector} The converted color.
 * @method
 * @category core
 */
export const convert = (input, fromSpace, toSpace, out = vec3()) => {
  // place into output
  vec3Copy(input, out);

  if (!fromSpace) throw new Error(`must specify a fromSpace`);
  if (!toSpace) throw new Error(`must specify a toSpace`);

  // special case: no conversion needed
  if (fromSpace === toSpace) {
    return out;
  }

  // e.g. convert OKLCH -> OKLab or sRGB -> sRGBLinear
  if (fromSpace.base) {
    out = fromSpace.toBase(out, out);
    fromSpace = fromSpace.base;
  }

  // now we have the base space like sRGBLinear or XYZ
  let fromBaseSpace = fromSpace;

  // and the base we want to get to, linear, OKLab, XYZ etc...
  let toBaseSpace = toSpace.base ?? toSpace;

  // this is something we may support in future, if there is a nice
  // zero-allocation way of achieving it
  if (fromSpace.base || toBaseSpace.base) {
    throw new Error(`Currently only base of depth=1 is supported`);
  }

  if (fromBaseSpace === toBaseSpace) {
    // do nothing, spaces are the same
  } else {
    // [from space] -> (adaptation) -> [xyz] -> (adaptation) -> [to space]

    // e.g. sRGB to ProPhotoLinear
    // sRGB -> sRGBLinear -> XYZ(D65) -> XYZD65ToD50 -> ProPhotoLinear
    // ProPhotoLinear -> XYZ(D50) -> XYZD50ToD65 -> sRGBLinear -> sRGB

    let xyzIn = fromBaseSpace.id === "xyz";
    let xyzOut = toBaseSpace.id === "xyz";
    let throughXYZ = false;
    let outputOklab = false;

    // spaces are different
    // check if we have a fast path
    // this isn't supported for d50-based whitepoints
    if (fromBaseSpace.id === "oklab") {
      let mat = toBaseSpace.fromLMS_M;
      if (!mat) {
        // space doesn't support direct from OKLAB
        // let's convert OKLab to XYZ and then use that
        mat = XYZ.fromLMS_M;
        throughXYZ = true;
        xyzIn = true;
      }
      // convert OKLAB to output (other space, or xyz)
      out = OKLab_to(out, mat, out);
    } else if (toBaseSpace.id === "oklab") {
      let mat = fromBaseSpace.toLMS_M;
      if (!mat) {
        // space doesn't support direct to OKLAB
        // we will need to use XYZ as connection, then convert to OKLAB
        throughXYZ = true;
        outputOklab = true;
      } else {
        // direct from space to OKLAB
        out = OKLab_from(out, mat, out);
      }
    } else {
      // any other spaces, we use XYZ D65 as a connection
      throughXYZ = true;
    }

    if (throughXYZ) {
      // First, convert to XYZ if we need to
      if (!xyzIn) {
        if (fromBaseSpace.toXYZ) {
          out = fromBaseSpace.toXYZ(out, out);
        } else if (fromBaseSpace.toXYZ_M) {
          out = transform(out, fromBaseSpace.toXYZ_M, out);
        } else {
          throw new Error(`no toXYZ or toXYZ_M on ${fromBaseSpace.id}`);
        }
      }

      // Then, adapt D50 <-> D65 if we need to
      if (fromBaseSpace.adapt) {
        out = transform(out, fromBaseSpace.adapt.to, out);
      }
      if (toBaseSpace.adapt) {
        out = transform(out, toBaseSpace.adapt.from, out);
      }

      // Now, convert XYZ to target if we need to
      if (!xyzOut) {
        if (outputOklab) {
          out = OKLab_from(out, XYZ.toLMS_M, out);
        } else if (toBaseSpace.fromXYZ) {
          out = toBaseSpace.fromXYZ(out, out);
        } else if (toBaseSpace.fromXYZ_M) {
          out = transform(out, toBaseSpace.fromXYZ_M, out);
        } else {
          throw new Error(`no fromXYZ or fromXYZ_M on ${toBaseSpace.id}`);
        }
      }
    }
  }

  // Now do the final transformation to the target space
  // e.g. OKLab -> OKLCH or sRGBLinear -> sRGB
  if (toBaseSpace !== toSpace) {
    if (toSpace.fromBase) {
      out = toSpace.fromBase(out, out);
    } else {
      throw new Error(`could not transform ${toBaseSpace.id} to ${toSpace.id}`);
    }
  }

  return out;
};

/**
 * Calculates the DeltaEOK (color difference) between two OKLab colors.
 * @param {Vector} oklab1 The first OKLab color.
 * @param {Vector} oklab2 The second OKLab color.
 * @returns {number} The delta E value.
 * @method
 * @category core
 */
export const deltaEOK = (oklab1, oklab2) => {
  let dL = oklab1[0] - oklab2[0];
  let da = oklab1[1] - oklab2[1];
  let db = oklab1[2] - oklab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
};
