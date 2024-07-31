export default function xorshift128(state) {
  let xs_state = new Uint32Array(4);

  // set initial
  setState(state);

  return {
    getState() {
      return xs_state;
    },
    setState,
    // random functions
    nextUint32,
    next,
  };

  function setState(view) {
    if (view.byteLength !== 16) throw new Error("expected 128 bit state");
    xs_state.set(view);
  }

  function next() {
    return nextUint32() / 0x100000000;
  }

  function nextUint32() {
    /* Algorithm "xor128" from p. 5 of Marsaglia, "Xorshift RNGs" */
    let t = xs_state[3];
    xs_state[3] = xs_state[2];
    xs_state[2] = xs_state[1];
    xs_state[1] = xs_state[0];
    let s = xs_state[0];
    t ^= t << 11;
    t ^= t >>> 8;
    xs_state[0] = t ^ s ^ (s >>> 19);
    return xs_state[0];
  }
}
