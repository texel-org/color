import { clamp, floatToByte, hexToRGB, vec3 } from "./util.js";
import { LMS_to_OKLab_M, OKLab_to_LMS_M } from "./conversion_matrices.js";
import { listColorSpaces, sRGB, XYZ } from "./spaces.js";

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

export const OKLab_to = (OKLab, LMS_to_output, out = vec3()) => {
  transform(OKLab, OKLab_to_LMS_M, out);
  cubed3(out);
  return transform(out, LMS_to_output, out);
};

export const OKLab_from = (input, input_to_LMS, out = vec3()) => {
  transform(input, input_to_LMS, out);
  cbrt3(out);
  return transform(out, LMS_to_OKLab_M, out);
};

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
  if (id == "srgb") {
    const r = floatToByte(tmp3[0]);
    const g = floatToByte(tmp3[1]);
    const b = floatToByte(tmp3[2]);
    const rgb = `${r}, ${g}, ${b}`;
    return alpha === 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${alpha})`;
  } else {
    const alphaSuffix = alpha === 1 ? "" : ` / ${alpha}`;
    if (id == "oklab" || id == "oklch") {
      return `${id}(${tmp3[0]} ${tmp3[1]} ${tmp3[2]}${alphaSuffix})`;
    } else {
      return `color(${id} ${tmp3[0]} ${tmp3[1]} ${tmp3[2]}${alphaSuffix})`;
    }
  }
};

const stripAlpha = (coords) => {
  if (coords.length >= 4 && coords[3] === 1) return coords.slice(0, 3);
  return coords;
};

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
    if (/^rgba?$/i.test(fn)) {
      const hasAlpha = fn == "rgba";
      const coords = parts[2]
        .split(",")
        .map((v, i) =>
          i < 3 ? clamp(parseInt(v, 10) || 0, 0, 255) / 255 : parseFloat(v)
        );
      const expectedLen = hasAlpha ? 4 : 3;
      if (coords.length !== expectedLen) {
        throw new Error(
          `got ${fn} with incorrect number of coords, expected ${expectedLen}`
        );
      }
      return {
        id: "srgb",
        coords: stripAlpha(coords),
      };
    } else {
      let id, coordsStrings;
      if (fn === "color") {
        const params =
          /([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^\s/]+)(?:\s?\/\s?([^\s]+))?/.exec(
            parts[2]
          );
        if (!params)
          throw new Error(`could not parse color() function ${input}`);
        id = params[1].toLowerCase();
        coordsStrings = params.slice(2, 6);
      } else if (/^(oklab|oklch)$/.test(fn)) {
        id = fn;
        const params =
          /([^\s]+)\s+([^\s]+)\s+([^\s/]+)(?:\s?\/\s?([^\s]+))?/.exec(parts[2]);
        if (!params)
          throw new Error(`could not parse color() function ${input}`);
        coordsStrings = params.slice(1, 6);
      }

      if (coordsStrings[3] == null) {
        coordsStrings = coordsStrings.slice(0, 3);
      }

      const coords = coordsStrings.map((f) => parseFloat(f));
      if (coords.length < 3 || coords.length > 4)
        throw new Error(`invalid number of coordinates`);
      return {
        id,
        coords: stripAlpha(coords),
      };
    }
  }
};
export const parse = (input, targetSpace, out = vec3()) => {
  if (!targetSpace)
    throw new Error(`must specify a target space to parse into`);

  const { coords, id } = deserialize(input);
  const space = listColorSpaces().find((f) => id === f.id);
  if (!space) throw new Error(`could not find space with the id ${id}`);
  const alpha = coords.length === 4 ? coords[3] : 1;

  // copy 3D coords to output and convert
  vec3Copy(coords, out);
  convert(out, space, targetSpace, out);

  // store alpha
  if (alpha !== 1) out[3] = alpha;
  // reduce to 3D
  if (alpha == 1 && out.length === 4) out.pop();
  return out;
};

export const convert = (input, fromSpace, toSpace, out = vec3()) => {
  // place into output
  vec3Copy(input, out);

  if (!fromSpace) throw new Error(`must specify a fromSpace`);
  if (!toSpace) throw new Error(`must specify a toSpace`);

  // special case: no conversion needed
  if (fromSpace == toSpace) {
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

// Calculate deltaE OK
// simple root sum of squares
export const deltaEOK = (oklab1, oklab2) => {
  let dL = oklab1[0] - oklab2[0];
  let da = oklab1[1] - oklab2[1];
  let db = oklab1[2] - oklab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
};
