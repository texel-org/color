const EPSILON = Number.EPSILON;

function defined() {
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] !== "undefined") {
      return arguments[i];
    }
  }
}

export const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

export function clamp01(v) {
  return clamp(v, 0, 1);
}

export function lerp(min, max, t) {
  return min * (1 - t) + max * t;
}

export function inverseLerp(min, max, t) {
  if (Math.abs(min - max) < EPSILON) return 0;
  else return (t - min) / (max - min);
}

export function smoothstep(min, max, t) {
  const x = clamp(inverseLerp(min, max, t), 0, 1);
  return x * x * (3 - 2 * x);
}

export function smootherstep(min, max, t) {
  const x = clamp(inverseLerp(min, max, t), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function toFinite(n, defaultValue) {
  defaultValue = defined(defaultValue, 0);
  return typeof n === "number" && isFinite(n) ? n : defaultValue;
}

export function lerpArray(min, max, t, out) {
  out = out || [];
  if (min.length !== max.length) {
    throw new TypeError(
      "min and max array are expected to have the same length"
    );
  }
  for (var i = 0; i < min.length; i++) {
    out[i] = lerp(min[i], max[i], t);
  }
  return out;
}

export function newArray(n, initialValue) {
  n = defined(n, 0);
  if (typeof n !== "number")
    throw new TypeError("Expected n argument to be a number");
  var out = [];
  for (var i = 0; i < n; i++) out.push(initialValue);
  return out;
}

export function linspace(n, opts) {
  n = defined(n, 0);
  if (typeof n !== "number")
    throw new TypeError("Expected n argument to be a number");
  opts = opts || {};
  if (typeof opts === "boolean") {
    opts = { endpoint: true };
  }
  var offset = defined(opts.offset, 0);
  if (opts.endpoint) {
    return newArray(n).map(function (_, i) {
      return n <= 1 ? 0 : (i + offset) / (n - 1);
    });
  } else {
    return newArray(n).map(function (_, i) {
      return (i + offset) / n;
    });
  }
}

export function lerpFrames(values, t, out) {
  t = clamp(t, 0, 1);

  var len = values.length - 1;
  var whole = t * len;
  var frame = Math.floor(whole);
  var fract = whole - frame;

  var nextFrame = Math.min(frame + 1, len);
  var a = values[frame % values.length];
  var b = values[nextFrame % values.length];
  if (typeof a === "number" && typeof b === "number") {
    return lerp(a, b, fract);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return lerpArray(a, b, fract, out);
  } else {
    throw new TypeError(
      "Mismatch in value type of two array elements: " +
        frame +
        " and " +
        nextFrame
    );
  }
}

export function mod(a, b) {
  return ((a % b) + b) % b;
}

export function degToRad(n) {
  return (n * Math.PI) / 180;
}

export function radToDeg(n) {
  return (n * 180) / Math.PI;
}

export function fract(n) {
  return n - Math.floor(n);
}

export function step(edge, x) {
  if (edge > x) return 0;
  else return 1;
}

export function sign(n) {
  if (n > 0) return 1;
  else if (n < 0) return -1;
  else return 0;
}

export function pingPong(t, length) {
  t = mod(t, length * 2);
  return length - Math.abs(t - length);
}

export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function dampArray(a, b, lambda, dt, out) {
  out = out || [];
  for (var i = 0; i < a.length; i++) {
    out[i] = damp(a[i], b[i], lambda, dt);
  }
  return out;
}

export function mapRange(
  value,
  inputMin,
  inputMax,
  outputMin,
  outputMax,
  clamp
) {
  // Reference:
  // https://openframeworks.cc/documentation/math/ofMath/
  if (Math.abs(inputMin - inputMax) < EPSILON) {
    return outputMin;
  } else {
    var outVal =
      ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) +
      outputMin;
    if (clamp) {
      if (outputMax < outputMin) {
        if (outVal < outputMax) outVal = outputMax;
        else if (outVal > outputMin) outVal = outputMin;
      } else {
        if (outVal > outputMax) outVal = outputMax;
        else if (outVal < outputMin) outVal = outputMin;
      }
    }
    return outVal;
  }
}
