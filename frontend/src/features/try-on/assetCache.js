// Garment asset loading with in-memory caching + pure anchor helpers.
// Switching colorways reuses cached images; the camera never restarts.
const cache = new Map();

export function loadGarment(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => {
        cache.delete(url);
        reject(new Error("Garment image failed to load (check URL + CORS)."));
      };
      img.src = url;
    }));
  }
  return cache.get(url);
}

export function clearGarmentCache() {
  cache.clear();
}

// Normalized API anchors -> source-image pixels.
export function anchorPoints(anchors, w, h) {
  const px = (p) => ({ x: p.x * w, y: p.y * h });
  return { A: px(anchors.left_shoulder), B: px(anchors.right_shoulder) };
}

// Pick the published asset for a color, or null (caller shows missing-asset state).
export function selectAssetForColor(assets, colorId) {
  return assets.find((a) => a.color_id === colorId) ?? null;
}
