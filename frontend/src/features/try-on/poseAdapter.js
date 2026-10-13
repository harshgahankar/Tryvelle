// Pose adapter: loads MediaPipe PoseLandmarker, throttles inference
// (one request in flight, monotonic timestamps), disposable.
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Self-hosted defaults (public/vendor, Apache-2.0, recorded in LICENSES.md).
// Served from our own origin: no runtime CDN dependency. Env vars override
// (e.g. staging CDN). Keep WASM matched to package.json (@mediapipe/tasks-vision).
const DEFAULT_WASM_BASE = "/vendor/mediapipe-wasm";
const DEFAULT_MODEL_URL = "/vendor/models/pose_landmarker_lite.task";

export async function createPoseAdapter({ modelUrl, wasmBase, numPoses = 1 } = {}) {
  const MODEL_URL = modelUrl || import.meta.env.VITE_POSE_MODEL_URL || DEFAULT_MODEL_URL;
  const WASM_BASE = wasmBase || import.meta.env.VITE_POSE_WASM_BASE_URL || DEFAULT_WASM_BASE;
  let landmarker = null;
  let disposed = false;
  let inFlight = false;
  let lastVideoTime = -1;

  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses,
    });
  } catch (e) {
    throw Object.assign(new Error("Pose model failed to load. Catalog browsing still works; retry the preview."), {
      code: "model-failure", cause: e,
    });
  }

  async function detect(video, nowMs) {
    if (disposed || !landmarker || inFlight) return null;
    if (video.readyState < 2 || video.videoWidth === 0) return null;
    const t = Math.max(nowMs, lastVideoTime + 1); // monotonic
    inFlight = true;
    try {
      const res = landmarker.detectForVideo(video, t);
      lastVideoTime = t;
      return res?.landmarks?.[0] ?? null;
    } finally {
      inFlight = false;
    }
  }

  function dispose() {
    disposed = true;
    try { landmarker?.close(); } catch { /* noop */ }
    landmarker = null;
  }

  return { detect, dispose };
}

// Garment asset metadata contract (asset-and-data-plan):
// { schema_version, width, height, anchors: {left_shoulder,right_shoulder,hem_center}, calibration }
export function validateGarmentMeta(meta) {
  if (!meta || meta.schema_version !== 1) return "Unsupported asset schema.";
  const pts = [meta.anchors?.left_shoulder, meta.anchors?.right_shoulder, meta.anchors?.hem_center];
  if (!pts.every((p) => p && isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1))
    return "Anchors must be finite normalized coordinates.";
  const span = Math.hypot(
    meta.anchors.right_shoulder.x - meta.anchors.left_shoulder.x,
    meta.anchors.right_shoulder.y - meta.anchors.left_shoulder.y
  );
  if (!(span > 0.01)) return "Shoulder span must be nonzero.";
  if (!(meta.calibration?.scale_multiplier > 0)) return "Calibration scale_multiplier must be positive.";
  return null;
}

export const REQUIRED_ASSET_DOC = {
  file: "transparent front-view garment PNG, ~1024px longest edge, <2MB, alpha channel, no model/skin",
  anchors: "normalized left_shoulder / right_shoulder / hem_center tied to exact asset version",
  calibration: "scale_multiplier (>0), offset_x/offset_y in shoulder-span fractions",
};
