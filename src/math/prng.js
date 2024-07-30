import xorshift128 from "./xorshift128.js";
import { djb2_str } from "./djb2.js";

// Constant salts used for seed hashing
const A = "e1f09545";
const B = "261cdc4d";
const C = "4c280a30";
const D = "53f4b637";

// generate 128 bits of random entropy
// this is not cryptographically secure
export function randomSeed(n = 16) {
  let seed = "";
  for (let i = 0; i < n; i++) {
    const randomByte = Math.floor(Math.random() * 256);
    seed += randomByte.toString(16).padStart(2, "0");
  }
  return seed;
}

export default function PRNG(seed = randomSeed()) {
  let _seed;
  let _nextGaussian = null;
  let _hasNextGaussian = false;
  let prng;

  // set initial seed which also constructs prng if needed
  setSeed(seed);

  return {
    setSeed,
    getSeed,
    random,
    value: random,
    boolean,
    range,
    rangeFloor,
    pick,
    shuffle,
    insideCircle,
    gaussian,
  };

  function getSeed() {
    return _seed;
  }

  function setSeed(seed) {
    seed = seed == null ? randomSeed() : seed;
    if (seed === false || typeof seed === "function") {
      const func = seed || Math.random;
      _seed = null;
      prng = {
        next: func,
      };
    } else {
      _seed = String(seed);
      const state = getState(_seed);
      if (!prng || !prng.setState) prng = xorshift128(state);
      else prng.setState(state);
    }

    _nextGaussian = null;
    _hasNextGaussian = false;
  }

  function getState(seed) {
    if (typeof seed !== "string") throw new Error("expected string");
    // hash the string into 128 bits using some constant salts
    const xs_state = new Uint32Array(4);
    xs_state[0] = djb2_str(seed + A);
    xs_state[1] = djb2_str(seed + B);
    xs_state[2] = djb2_str(seed + C);
    xs_state[3] = djb2_str(seed + D);
    return xs_state;
  }

  function random() {
    return prng.next();
  }

  // random boolean with 50% uniform chance
  function boolean() {
    return random() > 0.5;
  }

  // random value between min (inclusive) and max (exclusive)
  function range(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return random() * (max - min) + min;
  }

  // random value between min (inclusive) and max (exclusive), then floored
  function rangeFloor(min, max) {
    return Math.floor(range(min, max));
  }

  // pick a random element in the given array
  function pick(array) {
    return array.length ? array[rangeFloor(array.length)] : undefined;
  }

  // shuffle an array
  function shuffle(arr) {
    var rand;
    var tmp;
    var len = arr.length;
    var ret = [...arr];
    while (len) {
      rand = ~~(random() * len--);
      tmp = ret[len];
      ret[len] = ret[rand];
      ret[rand] = tmp;
    }
    return ret;
  }

  // random point in a uniform 2D disc with given radius
  function insideCircle(radius = 1, out = []) {
    var theta = random() * 2.0 * Math.PI;
    var r = radius * Math.sqrt(random());
    out[0] = r * Math.cos(theta);
    out[1] = r * Math.sin(theta);
    return out;
  }

  // random gaussian distribution
  function gaussian(mean = 0, standardDerivation = 1) {
    // https://github.com/openjdk-mirror/jdk7u-jdk/blob/f4d80957e89a19a29bb9f9807d2a28351ed7f7df/src/share/classes/java/util/Random.java#L496
    if (_hasNextGaussian) {
      _hasNextGaussian = false;
      var result = _nextGaussian;
      _nextGaussian = null;
      return mean + standardDerivation * result;
    } else {
      var v1 = 0;
      var v2 = 0;
      var s = 0;
      do {
        v1 = random() * 2 - 1; // between -1 and 1
        v2 = random() * 2 - 1; // between -1 and 1
        s = v1 * v1 + v2 * v2;
      } while (s >= 1 || s === 0);
      var multiplier = Math.sqrt((-2 * Math.log(s)) / s);
      _nextGaussian = v2 * multiplier;
      _hasNextGaussian = true;
      return mean + standardDerivation * (v1 * multiplier);
    }
  }
}
