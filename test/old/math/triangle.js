import { vec2 } from "gl-matrix";

const tmpBary0 = [0, 0];
const tmpBary1 = [0, 0];
const tmpBary2 = [0, 0];

export function barycentric(p, tri) {
  const a = tri[0];
  const b = tri[1];
  const c = tri[2];
  const v0 = vec2.sub(tmpBary0, b, a);
  const v1 = vec2.sub(tmpBary1, c, a);
  const v2 = vec2.sub(tmpBary2, p, a);
  const denInv = 1 / (v0[0] * v1[1] - v1[0] * v0[1]);
  const v = (v2[0] * v1[1] - v1[0] * v2[1]) * denInv;
  const w = (v0[0] * v2[1] - v2[0] * v0[1]) * denInv;
  return [1.0 - v - w, v, w];
}

export function barycentricVW(p, tri) {
  const a = tri[0];
  const b = tri[1];
  const c = tri[2];
  const v0 = vec2.sub(tmpBary0, b, a);
  const v1 = vec2.sub(tmpBary1, c, a);
  const v2 = vec2.sub(tmpBary2, p, a);
  const denInv = 1 / (v0[0] * v1[1] - v1[0] * v0[1]);
  const v = (v2[0] * v1[1] - v1[0] * v2[1]) * denInv;
  const w = (v0[0] * v2[1] - v2[0] * v0[1]) * denInv;
  return [v, w];
}

// Compute barycentric coordinates (u, v, w) for
// point p with respect to triangle (a, b, c)
// export function barycentric(p, [a, b, c]) {
//   const v0 = vec2.sub([], b, a);
//   const v1 = vec2.sub([], c, a);
//   const v2 = vec2.sub([], p, a);

//   const d00 = vec2.dot(v0, v0);
//   const d01 = vec2.dot(v0, v1);
//   const d11 = vec2.dot(v1, v1);
//   const d20 = vec2.dot(v2, v0);
//   const d21 = vec2.dot(v2, v1);
//   const denom = d00 * d11 - d01 * d01;
//   const v = (d11 * d20 - d01 * d21) / denom;
//   const w = (d00 * d21 - d01 * d20) / denom;
//   const u = 1.0 - v - w;
//   return [u, v, w];
// }

// // Compute barycentric coordinates (u, v, w) for
// // point p with respect to triangle (a, b, c)
// void Barycentric(Point p, Point a, Point b, Point c, float &u, float &v, float &w)
// {
//     Vector v0 = b - a, v1 = c - a, v2 = p - a;
//     float den = v0.x * v1.y - v1.x * v0.y;
//     v = (v2.x * v1.y - v1.x * v2.y) / den;
//     w = (v0.x * v2.y - v2.x * v0.y) / den;
//     u = 1.0f - v - w;
// }

export function barycentricToCartesian(barycentric, T) {
  const [u, v, w] = barycentric;
  const [[x0, y0], [x1, y1], [x2, y2]] = T;
  const x = u * x0 + v * x1 + w * x2;
  const y = u * y0 + v * y1 + w * y2;
  return [x, y];
}
// function barycentricToCartesian(barycentric, p0, p1, p2) {
//   const a = vec2DScale(p0, barycentric[0]);
//   const b = vec2DScale(p1, barycentric[1]);
//   const c = vec2DScale(p2, barycentric[2]);
//   return vec2DAdd(a, vec2DAdd(b, c));
// }

export function uniformToBarycentric(uv) {
  const su0 = Math.sqrt(uv[0]);
  const b0 = 1 - su0;
  const b1 = uv[1] * su0;
  return [b0, b1, 1 - b0 - b1];
}

const EPSILON = 0.001;
const EPSILON_SQUARE = EPSILON * EPSILON;

// http://totologic.blogspot.com/2014/01/accurate-point-in-triangle-test.html
function side(x1, y1, x2, y2, x, y) {
  return (y2 - y1) * (x - x1) + (-x2 + x1) * (y - y1);
}

function naivePointInTriangle(x1, y1, x2, y2, x3, y3, x, y) {
  var checkSide1 = side(x1, y1, x2, y2, x, y) >= 0;
  var checkSide2 = side(x2, y2, x3, y3, x, y) >= 0;
  var checkSide3 = side(x3, y3, x1, y1, x, y) >= 0;
  return checkSide1 && checkSide2 && checkSide3;
}

function pointInTriangleBoundingBox(x1, y1, x2, y2, x3, y3, x, y) {
  var xMin = Math.min(x1, Math.min(x2, x3)) - EPSILON;
  var xMax = Math.max(x1, Math.max(x2, x3)) + EPSILON;
  var yMin = Math.min(y1, Math.min(y2, y3)) - EPSILON;
  var yMax = Math.max(y1, Math.max(y2, y3)) + EPSILON;

  if (x < xMin || xMax < x || y < yMin || yMax < y) return false;
  else return true;
}

function distanceSquarePointToSegment(x1, y1, x2, y2, x, y) {
  var p1_p2_squareLength = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  var dotProduct =
    ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / p1_p2_squareLength;
  if (dotProduct < 0) {
    return (x - x1) * (x - x1) + (y - y1) * (y - y1);
  } else if (dotProduct <= 1) {
    var p_p1_squareLength = (x1 - x) * (x1 - x) + (y1 - y) * (y1 - y);
    return p_p1_squareLength - dotProduct * dotProduct * p1_p2_squareLength;
  } else {
    return (x - x2) * (x - x2) + (y - y2) * (y - y2);
  }
}

function accuratePointInTriangle(x1, y1, x2, y2, x3, y3, x, y) {
  if (!pointInTriangleBoundingBox(x1, y1, x2, y2, x3, y3, x, y)) return false;

  if (naivePointInTriangle(x1, y1, x2, y2, x3, y3, x, y)) return true;

  if (distanceSquarePointToSegment(x1, y1, x2, y2, x, y) <= EPSILON_SQUARE)
    return true;
  if (distanceSquarePointToSegment(x2, y2, x3, y3, x, y) <= EPSILON_SQUARE)
    return true;
  if (distanceSquarePointToSegment(x3, y3, x1, y1, x, y) <= EPSILON_SQUARE)
    return true;

  return false;
}
