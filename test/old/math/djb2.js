export function djb2_buf(buf) {
  let hash = 5381;
  let view = new Uint8Array(buf);
  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) + hash + view[i]) & 0xffffffff;
  }
  return hash >>> 0;
}

export function djb2_str(str) {
  let hash = 5381;
  for (let idx = 0; idx < str.length; idx++) {
    hash = ((hash << 5) + hash + str.charCodeAt(idx)) & 0xffffffff;
  }
  return hash >>> 0;
}
