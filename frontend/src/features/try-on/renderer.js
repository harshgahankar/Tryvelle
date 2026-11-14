// Single-canvas renderer: video, then garment, then UI guides.
// Mirroring applied exactly once to the combined scene.
import { coverTransform, similarityFromShoulders, affineFromTriangles } from "./geometry";

// transform.dst (optional): [shoulderL, shoulderR, hem] canvas targets for a
// hip-aware affine fit; without it the shoulder-only similarity path is used.
// lighting: garment brightness multiplier (1 = unchanged).
export function drawScene(ctx, { video, garmentImg, garmentPx, transform, W, H, dpr, showGuide = true, calib, lighting = 1 }) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, W, H);

  // --- mirrored scene pass ---
  ctx.save();
  ctx.translate(W, 0);
  ctx.scale(-1, 1);
  // video cover
  const vw = video.videoWidth, vh = video.videoHeight;
  if (vw && vh) {
    const { scale, offX, offY } = coverTransform(vw, vh, W, H);
    ctx.drawImage(video, offX, offY, vw * scale, vh * scale);
  }
  // garment: affine (shoulders + hem) or similarity (shoulders only), plus calibration
  if (garmentImg && transform && garmentPx) {
    const m = garmentMatrix(garmentPx, transform, calib);
    if (m) {
      ctx.setTransform(dpr * -1, 0, 0, dpr, dpr * W, 0); // keep mirror for garment
      ctx.transform(m.a, m.b, m.c, m.d, m.e * dpr, m.f * dpr);
      // Soft contact shadow + light matching so the PNG doesn't look pasted on.
      // Shadow params are in device px and ignore the transform.
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 14 * dpr;
      ctx.shadowOffsetY = 4 * dpr;
      const b = Math.round(lighting * 100) / 100;
      if (b !== 1 && "filter" in ctx) ctx.filter = `brightness(${b}) saturate(${Math.min(1, 0.6 + 0.4 * b).toFixed(2)})`;
      ctx.drawImage(garmentImg, 0, 0);
      ctx.filter = "none";
      ctx.shadowColor = "transparent";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
  ctx.restore();

  // --- unmirrored UI pass ---
  if (showGuide) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(W * 0.3, H * 0.12, W * 0.4, H * 0.7);
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(W * 0.3, H * 0.35); ctx.lineTo(W * 0.7, H * 0.35);
    ctx.moveTo(W / 2, H * 0.1); ctx.lineTo(W / 2, H * 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

// Garment-px -> canvas-CSS-px matrix {a,b,c,d,e,f}, or null.
export function garmentMatrix(garmentPx, transform, calib) {
  const { P, Q } = transform;
  const span = Math.hypot(Q.x - P.x, Q.y - P.y) || 1;
  const sMul = calib?.scale ?? 1;
  const ox = (calib?.offsetX ?? 0) * span;
  const oy = (calib?.offsetY ?? 0) * span;
  if (transform.dst && garmentPx.H) {
    const c = { x: (transform.dst[0].x + transform.dst[1].x) / 2, y: (transform.dst[0].y + transform.dst[1].y) / 2 };
    const dst = transform.dst.map((p) => ({ x: c.x + (p.x - c.x) * sMul + ox, y: c.y + (p.y - c.y) * sMul + oy }));
    return affineFromTriangles([garmentPx.A, garmentPx.B, garmentPx.H], dst);
  }
  const base = similarityFromShoulders(garmentPx.A, garmentPx.B, P, Q);
  if (!base) return null;
  const c = Math.cos(base.theta) * base.s * sMul;
  const sn = Math.sin(base.theta) * base.s * sMul;
  return { a: c, b: sn, c: -sn, d: c, e: base.tx + ox, f: base.ty + oy };
}
