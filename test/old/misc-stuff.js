function distToLine(from, a, b) {
  const [x1, y1] = a,
    [x2, y2] = b;
  const sideWidth = vec2.distance(a, b);
  return (
    ((y2 - y1) * from[0] - (x2 - x1) * from[1] + x2 * y1 - y2 * x1) / sideWidth
  );
}
// function findPerpendicularIntersection([x, y], p0, p1) {
//   // Function to subtract two points
//   function subtract(p1, p2) {
//     return [p1[0] - p2[0], p1[1] - p2[1]];
//   }

//   // Function to add two vectors
//   function add(p1, p2) {
//     return [p1[0] + p2[0], p1[1] + p2[1]];
//   }

//   // Function to calculate the dot product of two vectors
//   function dot(v1, v2) {
//     return v1[0] * v2[0] + v1[1] * v2[1];
//   }

//   // Function to multiply a vector by a scalar
//   function multiplyScalar(v, s) {
//     return [v[0] * s, v[1] * s];
//   }

//   // Function to compute the magnitude of a vector
//   function magnitude(v) {
//     return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
//   }

//   // Calculate the vector from p0 to p1
//   let v = subtract(p1, p0);

//   // Normalize this vector
//   let mag = magnitude(v);
//   let norm = [v[0] / mag, v[1] / mag];

//   // Calculate the vector from p0 to the point [x, y]
//   let vp = subtract([x, y], p0);

//   // Project vp onto the normalized vector of the line
//   let projLength = dot(vp, norm);
//   let projPoint = add(p0, multiplyScalar(norm, projLength));

//   return projPoint;
// }

function closestPointOnLineSegment(pt, segA, segB) {
  const A = pt[0] - segA[0],
    B = pt[1] - segA[1],
    C = segB[0] - segA[0],
    D = segB[1] - segA[1];

  const segLenSq = C ** 2 + D ** 2;
  const t = segLenSq != 0 ? (A * C + B * D) / segLenSq : -1;
  return t;
  // return t < 0
  //   ? segA.slice()
  //   : t > 1
  //   ? segB.slice()
  //   : [segA[0] + t * C, segA[1] + t * D];
}

function findPerpendicularIntersection(P, A, B) {
  const AB = [B[0] - A[0], B[1] - A[1]];
  const k =
    ((P[0] - A[0]) * AB[0] + (P[1] - A[1]) * AB[1]) /
    (AB[0] * AB[0] + AB[1] * AB[1]);
  return k;

  // // Calculate vectors AB and BC
  // const AB = vec2.create();
  // vec2.subtract(AB, B, A);

  // const BC = vec2.create();
  // vec2.subtract(BC, C, B);

  // // Calculate magnitudes of AB and BC
  // const b = vec2.length(AB);
  // const d = vec2.length(BC);

  // // Calculate vector AC and its magnitude c
  // const AC = vec2.create();
  // vec2.subtract(AC, C, A);
  // const c = vec2.length(AC);

  // // Using the derived formula to find a:
  // // a = (b^2 - d^2) / (2*(a + c)) + (a + c) / 2
  // const numerator = Math.pow(b, 2) - Math.pow(d, 2);
  // const denominator = 2 * c;
  // const a = numerator / denominator + c / 2;

  // // Calculate the vector from A to D
  // const AD = vec2.create();
  // vec2.normalize(AC, AC);
  // vec2.scale(AD, AC, a);

  // // Point D coordinates
  // const D = vec2.create();
  // vec2.add(D, A, AD);
  // return D;

  // Calculate the normalized direction vector of the line
  // const direction = vec2.subtract([], p1, p0);
  // const normalizedDirection = vec2.normalize([], direction);

  // // Calculate the perpendicular vector
  // const perp = normalizedDirection;
  // // const perp = [-normalizedDirection[1], normalizedDirection[0]];

  // // Vector from p0 to the point [x, y]
  // const p0ToPoint = vec2.subtract([], point, p0);

  // // Project p0ToPoint onto the perpendicular vector
  // const projectionLength = vec2.dot(p0ToPoint, perp);
  // const projection = [perp[0] * projectionLength, perp[1] * projectionLength];

  // // Calculate the intersection point
  // const intersection = [p0[0] + projection[0], p0[1] + projection[1]];
  // return intersection;
}

function determineEdgeMapping(L, C, A, cusp, B) {
  // Function to calculate vector from p1 to p2
  function vector(p1, p2) {
    return [p2[0] - p1[0], p2[1] - p1[1]];
  }

  // Function to calculate the dot product of two vectors
  function dot(v1, v2) {
    return v1[0] * v2[0] + v1[1] * v2[1];
  }

  // Function to calculate the magnitude of a vector
  function magnitude(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  }

  // Function to find the cosine of the angle between two vectors
  function cosine(v1, v2) {
    return dot(v1, v2) / (magnitude(v1) * magnitude(v2));
  }

  // Calculate vectors
  const vectorPointToCusp = vector([L, C], cusp);
  const vectorAToCusp = vector(A, cusp);
  const vectorBToCusp = vector(B, cusp);

  // Calculate cosine of angles to determine which is smaller
  const cosPointToACusp = cosine(vectorPointToCusp, vectorAToCusp);
  const cosPointToBCusp = cosine(vectorPointToCusp, vectorBToCusp);

  // Compare cosines to determine closest edge
  if (cosPointToACusp > cosPointToBCusp) {
    // console.log("Point maps to edge A -> CUSP");
    return [A, cusp];
  } else {
    return [B, cusp];
    // console.log("Point maps to edge B -> CUSP");
  }
}
function pointInTriangle(p, triangle) {
  const uvw = barycentric(p, triangle);
  return uvw[0] >= 0 && uvw[1] >= 0 && uvw[2] >= 0;
}

function findProjectionT(C, A, B) {
  // lines AB and AC
  const AB = vec2.sub([], B, A);
  const AC = vec2.sub([], C, A);

  // Dot product of AB and AC
  const dot = vec2.dot(AB, AC);

  // Magnitude squared of AB
  const magSqr = vec2.squaredLength(AB);

  // The parameter t
  return magSqr == 0 ? dot : dot / magSqr;
}

function snapToPointOnEdge(L, C, A, cusp, B) {
  // Function to calculate vector from p1 to p2
  function vector(p1, p2) {
    return [p2[0] - p1[0], p2[1] - p1[1]];
  }

  // Function to calculate the projection of point p onto line segment p1->p2
  function projectPointOnLine(p, p1, p2) {
    const v = vector(p1, p2);
    const w = vector(p1, p);
    const vDotV = vec2.dot(v, v);
    const wDotV = vec2.dot(w, v);
    const t = wDotV / vDotV;

    // Projection coordinates
    const projection = [p1[0] + t * v[0], p1[1] + t * v[1]];
    return {
      projection: projection,
      t: t, // This is the normalized position along the line
    };
  }

  // Calculate projection to both edges
  const projToACusp = projectPointOnLine([L, C], A, cusp);
  const projToBCusp = projectPointOnLine([L, C], B, cusp);

  // Check if projection is within the segments and determine the closest
  let closestProjection,
    closestDistance = Infinity,
    lineIndex = 0;

  [projToACusp, projToBCusp].forEach((proj, i) => {
    if (proj.t >= 0 && proj.t <= 1) {
      // Check if the projection is within the line segment
      const distance = Math.sqrt(
        Math.pow(L - proj.projection[0], 2) +
          Math.pow(C - proj.projection[1], 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProjection = proj.projection;
        lineIndex = i;
      }
    }
  });

  // If no valid projection within segments, check endpoints
  if (closestDistance === Infinity) {
    [
      [A, 0],
      [cusp, 1],
      [B, 0],
    ].forEach((endpoint) => {
      const distance = Math.sqrt(
        Math.pow(L - endpoint[0][0], 2) + Math.pow(C - endpoint[0][1], 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestProjection = endpoint[0];
      }
    });
  }

  // console.log(`Snap point to: (${closestProjection[0]}, ${closestProjection[1]})`);
  return [lineIndex == 0 ? [A, cusp] : [B, cusp], closestProjection];
}

function intersectLineSegmentLineSegment(p1, p2, p3, p4) {
  // Reference:
  // https://github.com/evil-mad/EggBot/blob/master/inkscape_driver/eggbot_hatch.py
  const d21x = p2[0] - p1[0];
  const d21y = p2[1] - p1[1];
  const d43x = p4[0] - p3[0];
  const d43y = p4[1] - p3[1];

  // denominator
  const d = d21x * d43y - d21y * d43x;
  if (d === 0) return -1;

  const nb = (p1[1] - p3[1]) * d21x - (p1[0] - p3[0]) * d21y;
  const sb = nb / d;
  if (sb < 0 || sb > 1) return -1;

  const na = (p1[1] - p3[1]) * d43x - (p1[0] - p3[0]) * d43y;
  const sa = na / d;
  if (sa < 0 || sa > 1) return -1;
  return sa;
}

function findLineIntersection(xLine, A, B) {
  const [x1, y1] = A;
  const [x2, y2] = B;

  // Check if the segment is vertical
  if (x1 === x2) {
    if (x1 === xLine) {
      // The segment is the vertical line
      return null;
    } else {
      // No intersection if the segment is parallel but not coincident
      return null;
    }
  }

  // Calculate the intersection using the line equation
  const t = (xLine - x1) / (x2 - x1);
  const inside = t >= 0 && t <= 1;
  return {
    t,
    inside,
    intersection: inside ? [xLine, y1 + t * (y2 - y1)] : null,
  };
}

function getClosestPointOnLineSegment(A, B, P) {
  const AP = vec2.sub([], P, A); //Vector from A to P
  const AB = vec2.sub([], B, A); //Vector from A to B

  const magnitudeAB = vec2.squaredLength(AB); //Magnitude of AB vector (it's length squared)
  if (magnitudeAB <= 0) return A; // line is actually just a point, return one end
  const ABAPproduct = vec2.dot(AP, AB); //The DOT product of a_to_p and a_to_b
  const distance = ABAPproduct / magnitudeAB; //The normalized "distance" from a to your closest point
  if (distance < 0) {
    //Check if P projection is over vectorAB
    return { point: A.slice(), distance };
  } else if (distance > 1) {
    return { point: B.slice(), distance };
  } else {
    return { point: vec2.scaleAndAdd([], A, AB, distance), distance };
  }
}

function whichSideOfCusp(lc, A, cusp, B) {
  const vecCuspA = vec2.sub([], cusp, A);
  const vecCuspLCA = vec2.sub([], lc, A);
  const crossProdA = vecCuspA[0] * vecCuspLCA[1] - vecCuspA[1] * vecCuspLCA[0];

  const vecCuspB = vec2.sub([], cusp, B);
  const vecCuspLCB = vec2.sub([], lc, B);
  const crossProdB = vecCuspB[0] * vecCuspLCB[1] - vecCuspB[1] * vecCuspLCB[0];
  return [crossProdA, crossProdB];
}
