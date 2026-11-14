// Scene-light matching: the garment PNG is shot in studio light, the wearer
// usually isn't. We sample the camera frame at low resolution and dim or
// lift the garment to match. Pure math lives here so it can be tested.

export const LIGHT_REF_LUMA = 0.45; // luma a studio asset is assumed to suit
export const LIGHT_MIN = 0.72;
export const LIGHT_MAX = 1.1;

// Mean Rec.709 luma (0..1) of RGBA pixel data, ignoring transparent pixels.
export function meanLuma(data) {
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n ? sum / n / 255 : LIGHT_REF_LUMA;
}

// Brightness multiplier for the garment. Square root keeps it gentle.
export function brightnessForLuma(luma) {
  if (!isFinite(luma) || luma <= 0) return LIGHT_MIN;
  return Math.min(LIGHT_MAX, Math.max(LIGHT_MIN, Math.sqrt(luma / LIGHT_REF_LUMA)));
}

// Samples the video into a tiny canvas. Returns a sampler fn or a no-op.
export function createLightSampler(size = 24) {
  let c = null, ctx = null;
  try {
    c = document.createElement("canvas");
    c.width = c.height = size;
    ctx = c.getContext("2d", { willReadFrequently: true });
  } catch { /* noop */ }
  return (video) => {
    if (!ctx || !video?.videoWidth) return null;
    try {
      ctx.drawImage(video, 0, 0, size, size);
      return brightnessForLuma(meanLuma(ctx.getImageData(0, 0, size, size).data));
    } catch {
      return null;
    }
  };
}
