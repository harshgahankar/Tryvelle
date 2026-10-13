# Milestone 1 — Camera prototype (opencode-start-prompt)

## What was built
Standalone real-camera route **` /prototype/try-on`** for one front-facing T-shirt:
- `src/features/try-on/camera.js` — Start only after user action, video-only (no audio), stop-all-tracks cleanup on close/unmount/switch/background.
- `src/features/try-on/poseAdapter.js` — MediaPipe PoseLandmarker (VIDEO mode, one in flight, monotonic timestamps), disposable; garment metadata validator.
- `src/features/try-on/geometry.js` — cover mapping + single mirror, shoulder similarity transform, visibility ≥0.6 / 300ms-stale / span guards, exponential smoothing.
- `src/features/try-on/renderer.js` — one canvas: video → garment → guides; controls stay in DOM.
- `src/features/try-on/geometry.test.js` — 12 focused tests (`npm test`).
- `.env.example` — public `VITE_*` placeholders only.

## Conflicts found (chose smallest first-release-consistent option)
1. **Stack is JS, prompt asks TypeScript.** Kept existing JS storefront; prototype is plain JS modules. Deviation recorded here; TS migration deferred to Milestone 2 foundation.
2. **Demo shipping:** `api-plan.md` says shipping is explicitly zero in demo mode, but the converted storefront charges ₹99/199. Prototype does not touch checkout; align to zero-shipping when the real orders API lands (Milestone 6).

## Missing-asset state (per prompt — no invented garment, no color rectangle)
No licensed transparent garment PNG exists in the repo, so the prototype renders **wireframe guides only** with a labeled badge + the exact requirement in the side panel and below. To enable the overlay: set `VITE_GARMENT_URL` to a CORS-enabled transparent front-view PNG (~1024px, <2MB, alpha, no model/skin) and per-color `{schema_version:1, anchors:{left_shoulder,right_shoulder,hem_center} normalized, calibration:{scale_multiplier>0, offset_x,offset_y in span fractions}}`.

## Setup
```
cd frontend
cp .env.example .env   # fill VITE_* URLs
npm install
npm test               # 12 passed
npm run dev            # open /prototype/try-on (HTTPS or localhost for camera)
```

## Physical-device checklist (record per run)
Denied / no-camera / busy / unsupported / model-failure / missing-asset / no-body / partial shoulders / movement / bright+dim light / front+back camera / portrait+landscape / route exit / background-resume. Log: device, OS, browser+version, viewport, camera resolution, fps, inference interval, alignment notes, pass/fail. Verify in network inspection that no frame/landmark leaves the browser and the camera indicator stops on every close path.
