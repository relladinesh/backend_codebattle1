export function normalize(out) {
  if (out == null) return "";
  return String(out).trim().replace(/\r\n/g, "\n");
}
