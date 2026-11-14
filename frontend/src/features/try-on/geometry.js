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
// mirrored=true is for SCREEN-space UI (status overlays). The garment
// similarity transform must use mirrored=false: the renderer mirrors the
// whole scene once at draw time, and a rotation cannot represent the extra
// reflection (it comes out as a 180-degree flip). Garment anchors use
// wearer anatomy (left_shoulder = wearer's left = image-right).
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

// ---------------------------------------------------------------------------
// Hip-aware torso fit (3-point affine).
// The similarity transform only knows the shoulders, so the garment can't
// follow a lean or a longer/shorter torso. When the hips are trustworthy we
// also pin the garment's hem_center to the body, giving a full affine
// (shear + non-uniform stretch). Clamped so a bad hip estimate can't wreck
// the overlay; without hips we fall back to the exact similarity result.
// ---------------------------------------------------------------------------
export const HIP_VISIBILITY_MIN = 0.5;
export const HEM_STRETCH_MIN = 0.85;
export const HEM_STRETCH_MAX = 1.25;
export const HEM_LEAN_MAX_RAD = 0.44; // ~25 degrees off the shoulder normal

// MediaPipe Pose Landmarker: hips are landmarks 23 (left) and 24 (right).
export function extractHips(landmarks) {
  if (!landmarks || landmarks.length < 25) return null;
  const L = landmarks[23], R = landmarks[24];
  const vis = (l) => (typeof l.visibility === "number" ? l.visibility : CONFIDENCE_DEFAULT);
  if (Math.min(vis(L), vis(R)) < HIP_VISIBILITY_MIN) return null;
  // Out-of-frame hips are extrapolated by the model; don't trust them.
  if (![L, R].every((p) => isFinite(p.x) && isFinite(p.y) && p.y >= 0 && p.y <= 1.02)) return null;
  return { L: { x: L.x, y: L.y }, R: { x: R.x, y: R.y } };
}

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Affine mapping triangle src -> dst. Returns canvas-style {a,b,c,d,e,f}:
// x' = a*x + c*y + e ; y' = b*x + d*y + f
export function affineFromTriangles(s, d) {
  const [s0, s1, s2] = s;
  const det = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (!isFinite(det) || Math.abs(det) < 1e-6) return null;
  const ux = s1.x - s0.x, uy = s1.y - s0.y, vx = s2.x - s0.x, vy = s2.y - s0.y;
  const solve = (k) => {
    const du = d[1][k] - d[0][k], dv = d[2][k] - d[0][k];
    const p = (du * vy - dv * uy) / det; // coefficient on x
    const q = (dv * ux - du * vx) / det; // coefficient on y
    return [p, q, d[0][k] - p * s0.x - q * s0.y];
  };
  const [a, c, e] = solve("x");
  const [b, dd, f] = solve("y");
  const m = { a, b, c, d: dd, e, f };
  return Object.values(m).every(isFinite) ? m : null;
}

export function applyAffine(m, p) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

// Where the garment hem should land. sim = shoulder similarity transform,
// H = garment hem_center (source px), hip = body hip midpoint (canvas px) or null.
export function hemTarget(sim, H, P, Q, hip) {
  const simH = { x: sim.c * H.x - sim.sn * H.y + sim.tx, y: sim.sn * H.x + sim.c * H.y + sim.ty };
  if (!hip) return simH;
  const m = mid(P, Q);
  const base = { x: simH.x - m.x, y: simH.y - m.y };
  const baseLen = Math.hypot(base.x, base.y);
  const body = { x: hip.x - m.x, y: hip.y - m.y };
  const bodyLen = Math.hypot(body.x, body.y);
  if (baseLen < 1e-6 || bodyLen < 1e-6) return simH;
  // The garment hem sits at its own length along the torso; hips only steer
  // direction and nudge length (garments end above or below the hip).
  const stretch = Math.min(HEM_STRETCH_MAX, Math.max(HEM_STRETCH_MIN, bodyLen / baseLen));
  const baseAng = Math.atan2(base.y, base.x);
  let lean = Math.atan2(body.y, body.x) - baseAng;
  lean = Math.atan2(Math.sin(lean), Math.cos(lean));
  lean = Math.min(HEM_LEAN_MAX_RAD, Math.max(-HEM_LEAN_MAX_RAD, lean));
  const L = baseLen * stretch, A = baseAng + lean;
  return { x: m.x + Math.cos(A) * L, y: m.y + Math.sin(A) * L };
}

export function hipMidpoint(hips, mapFn) {
  if (!hips) return null;
  return mid(mapFn(hips.L), mapFn(hips.R));
}

// Time-aware exponential smoothing for a list of target points.
export function smoothPoints(prev, next, dtMs, tauMs = 120) {
  if (!prev || prev.length !== next.length) return next;
  const a = 1 - Math.exp(-dtMs / tauMs);
  return next.map((n, i) => ({ x: prev[i].x + (n.x - prev[i].x) * a, y: prev[i].y + (n.y - prev[i].y) * a }));
}
