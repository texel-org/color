const EPSILON = Math.pow(2, -33); // ~= 0.0000000001

export default function arrayAlmostEqual(a, b, tolerance = EPSILON) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p0 = a[i];
    const p1 = b[i];
    if (p0 !== p1) {
      const diff = Math.abs(p1 - p0);
      if (diff > tolerance) return false;
    }
  }
  return true;
}
