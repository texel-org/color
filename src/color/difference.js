// Calculate deltaE OK
// simple root sum of squares
export const deltaEOK = (oklab1, oklab2) => {
  let dL = oklab1[0] - oklab2[0];
  let da = oklab1[1] - oklab2[1];
  let db = oklab1[2] - oklab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
};
