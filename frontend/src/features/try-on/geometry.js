// Pure coordinate + transform math for the live try-on loop.
// Per virtual-try-on-spec: object-fit cover mapping, mirror applied once,
// shoulder-anchor similarity transform, smoothing + confidence guards.

export const CONFIDENCE_DEFAULT = 0.5;
export const SHOULDER_VISIBILITY_MIN = 0.6;
export const TRACKING_STALE_MS = 300;
export const SHOULDER_SPAN_MIN_PX = 20;
export const SHOULDER_SPAN_MAX_RATIO = 0.95; // span wider than 95% of viewport => implausible

// Map a normalized landmark (unmirrored source coords) into canvas CSS px
// using the same cover transform used to draw video.
export function mapLandmarkToCanvas(lm, videoW, videoH, viewW, viewH, mirrored = true) {
  const scale = Math.max(viewW / videoW, viewH / videoH);
  const offX = (viewW - videoW * scale) / 2;
  const offY = (viewH - videoH * scale) / 2;
  let x = lm.x * videoW * scale + offX;
  const y = lm.y * videoH * scale + offY;
  if (mirrored) x = viewW - x; // mirror exactly once (selfie view)
  return { x, y };
}

export function coverTransform(videoW, videoH, viewW, viewH) {
  const scale = Math.max(viewW / videoW, viewH / videoH);
  return { scale, offX: (viewW - videoW * scale) / 2, offY: (viewH - videoH * scale) / 2 };
}

const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// Similarity transform aligning garment shoulders A,B (source-image px)
// to body targets P,Q (canvas CSS px): x' = s*R(theta)*x + t
export function similarityFromShoulders(A, B, P, Q) {
  const srcLen = len(A, B);
  const dstLen = len(P, Q);
  if (!isFinite(srcLen) || !isFinite(dstLen) || srcLen < 1e-6) return null;
  const s = dstLen / srcLen;
  const theta = ang(P, Q) - ang(A, B);
  if (!isFinite(s) || !isFinite(theta)) return null;
  const c = Math.cos(theta) * s;
  const sn = Math.sin(theta) * s;
  // t = P - s*R*A
  const tx = P.x - (c * A.x - sn * A.y);
  const ty = P.y - (sn * A.x + c * A.y);
  if (![c, sn, tx, ty].every(isFinite)) return null;
  return { s, theta, tx, ty, c, sn };
}

// Validate landmark pair before use: visibility, span plausibility.
export function validateShoulders(p, q, vp, vq, viewW) {
  if (!p || !q) return { ok: false, reason: "no-body" };
  if (![p.x, p.y, q.x, q.y].every(isFinite)) return { ok: false, reason: "nonfinite" };
  const visMin = Math.min(vp ?? CONFIDENCE_DEFAULT, vq ?? CONFIDENCE_DEFAULT);
  if (visMin < SHOULDER_VISIBILITY_MIN) return { ok: false, reason: "low-confidence" };
  const span = Math.hypot(q.x - p.x, q.y - p.y);
  if (span < SHOULDER_SPAN_MIN_PX) return { ok: false, reason: "span-too-small" };
  if (span > viewW * SHOULDER_SPAN_MAX_RATIO) return { ok: false, reason: "span-implausible" };
  return { ok: true, span };
}

export function isStale(lastOkAt, now) {
  return now - lastOkAt > TRACKING_STALE_MS;
}

// Time-aware exponential smoothing for transform values.
export function smoothTransform(prev, next, dtMs, tauMs = 120) {
  if (!prev) return next;
  const a = 1 - Math.exp(-dtMs / tauMs);
  const lerp = (x, y) => x + (y - x) * a;
  // lerp angle via vector to avoid wrap issues
  const px = Math.cos(prev.theta), py = Math.sin(prev.theta);
  const nx = Math.cos(next.theta), ny = Math.sin(next.theta);
  const theta = Math.atan2(lerp(py, ny), lerp(px, nx));
  return { s: lerp(prev.s, next.s), theta, tx: lerp(prev.tx, next.tx), ty: lerp(prev.ty, next.ty) };
}

// MediaPipe Pose Landmarker: shoulders are landmarks 11 (left) and 12 (right).
export function extractShoulders(landmarks) {
  if (!landmarks || landmarks.length < 13) return null;
  const L = landmarks[11], R = landmarks[12];
  const vis = (l) => (typeof l.visibility === "number" ? l.visibility : CONFIDENCE_DEFAULT);
  return { L: { x: L.x, y: L.y }, R: { x: R.x, y: R.y }, vL: vis(L), vR: vis(R) };
}
