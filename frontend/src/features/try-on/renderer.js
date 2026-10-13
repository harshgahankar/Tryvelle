// Single-canvas renderer: video, then garment, then UI guides.
// Mirroring applied exactly once to the combined scene.
import { coverTransform, similarityFromShoulders } from "./geometry";

export function drawScene(ctx, { video, garmentImg, garmentPx, transform, W, H, dpr, showGuide = true, calib }) {
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
  // garment via similarity transform + manual calibration
  if (garmentImg && transform && garmentPx) {
    const span = Math.hypot(transform.Q.x - transform.P.x, transform.Q.y - transform.P.y) || 1;
    const sMul = calib?.scale ?? 1;
    const ox = (calib?.offsetX ?? 0) * span;
    const oy = (calib?.offsetY ?? 0) * span;
    const base = similarityFromShoulders(garmentPx.A, garmentPx.B, transform.P, transform.Q);
    if (base) {
      const c = Math.cos(base.theta) * base.s * sMul;
      const sn = Math.sin(base.theta) * base.s * sMul;
      const tx = base.tx + ox;
      const ty = base.ty + oy;
      ctx.setTransform(dpr * -1, 0, 0, dpr, dpr * W, 0); // keep mirror for garment
      ctx.transform(c, sn, -sn, c, tx * dpr, ty * dpr);
      ctx.drawImage(garmentImg, 0, 0);
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
