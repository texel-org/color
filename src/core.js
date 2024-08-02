import { floatToByte, vec3 } from "./util.js";
import { LMS_to_OKLab_M, OKLab_to_LMS_M } from "./conversion_matrices.js";
import { XYZ } from "./spaces.js";

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
  if (inputSpace !== outputSpace) {
    convert(input, inputSpace, outputSpace, tmp3);
  } else {
    vec3Copy(input, tmp3);
  }

  const id = outputSpace.id;
  if (id == "srgb") {
    const r = floatToByte(tmp3[0]);
    const g = floatToByte(tmp3[1]);
    const b = floatToByte(tmp3[2]);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (id == "oklab" || id == "oklch") {
    return `${id}(${tmp3[0]} ${tmp3[1]} ${tmp3[2]})`;
  } else {
    return `color(${id} ${tmp3[0]} ${tmp3[1]} ${tmp3[2]})`;
  }
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
        // space doesn't support direct
        // let's convert OKLab to XYZ and then use that
        mat = XYZ.fromLMS_M;
        throughXYZ = true;
        xyzIn = true;
      }
      out = OKLab_to(out, mat, out);
    } else if (toBaseSpace.id === "oklab") {
      let mat = fromBaseSpace.toLMS_M;
      if (!mat) {
        // space doesn't support direct
        throughXYZ = true;
        outputOklab = true;
      } else {
        // direct from space to oklab
        out = OKLab_from(out, mat, out);
      }
    } else {
      throughXYZ = true;
    }

    if (throughXYZ) {
      // First, convert to XYZ if we need to
      if (!xyzIn) {
        if (!fromBaseSpace.toXYZ_M)
          throw new Error(`no toXYZ_M on ${fromBaseSpace.id}`);
        out = transform(out, fromBaseSpace.toXYZ_M, out);
      }

      // Then, adapt D50 <-> D65 if we need to
      if (fromBaseSpace.adapt) {
        out = transform(out, fromBaseSpace.adapt.to, out);
      } else if (toBaseSpace.adapt) {
        out = transform(out, toBaseSpace.adapt.from, out);
      }

      // Now, convert XYZ to target if we need to
      if (!xyzOut) {
        if (outputOklab) {
          out = OKLab_from(out, XYZ.toLMS_M, out);
        } else {
          if (!toBaseSpace.fromXYZ_M)
            throw new Error(`no fromXYZ_M on ${toBaseSpace.id}`);
          out = transform(out, toBaseSpace.fromXYZ_M, out);
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
