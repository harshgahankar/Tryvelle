# Live Camera Try On Specification

## Supported first version

Support one person, mostly facing the camera, with shoulders and torso visible. Support prepared T-shirt and top images per product color. Preview follows torso movement using a two-dimensional transform. It does not infer garment fit from a selected size.

Google's Pose Landmarker Web guide documents image/video landmark detection and warns that detection calls run synchronously and may block the UI thread. Prototype a worker-based inference adapter or throttled inference loop; benchmark the chosen approach on target browsers before committing.

## Camera lifecycle

1. Show the local-processing explanation and require Start camera.
2. Check secure context, getUserMedia availability and model/asset readiness.
3. Request video with preferred front camera and audio disabled.
4. Bind stream to a muted, autoplay, playsinline video element.
5. Process new video frames only; keep one inference request in flight.
6. Use monotonic increasing timestamps for video inference.
7. On close, unmount, route exit or camera switch: stop all tracks, cancel loops, dispose inference resources and remove video references.
8. On backgrounding, stop inference and release camera for the initial implementation. Require an explicit resume when returning.

Permission denial should explain how to retry via browser settings. Do not repeatedly prompt. Camera selection is best effort; stop the old stream before requesting the new one.

## Coordinate handling

Track intrinsic video width and height, displayed viewport dimensions and device pixel ratio. Map normalized landmark coordinates through the same crop/letterbox transform used to draw video. Prefer drawing video and garment into one canvas so transforms agree.

For an object-fit cover viewport, scale equals max(viewportWidth/videoWidth, viewportHeight/videoHeight). Center offsets are (viewport dimension minus scaled video dimension)/2. Map each landmark into intrinsic pixels, apply this scale and offset, then apply the display mirroring exactly once to the combined image. Keep source-coordinate math unmirrored.

Use device pixel ratio for the canvas backing resolution but keep layout calculations in CSS pixels. Recompute transforms on resize, orientation changes and camera resolution changes.

## Garment calibration

Store normalized garment anchors for left shoulder, right shoulder and hem center. Store permitted offset/scale calibration and a schema version. A garment image must include the exact intended transparent padding; anchors are tied to that asset version.

Let garment shoulder points be A and B in source-image pixels; target body shoulder points are P and Q in canvas CSS pixels.

- Scale s = length(Q − P) / length(B − A).
- Rotation theta = angle(Q − P) − angle(B − A).
- Translation t = P − s R(theta) A.
- Draw source image through x' = s R(theta) x + t.

This similarity transform aligns both shoulders. Hip midpoint and hem anchor check torso length and framing, but do not stretch the garment independently in the baseline. An optional later mesh deformation may use torso landmarks; it needs separate visual validation.

Smooth target transform values with time-aware exponential smoothing. Starting values: detection confidence 0.5; reject shoulder visibility below 0.6; hide preview after 300 ms without usable landmarks. These are tuning defaults, not model guarantees. Reject tiny or implausible shoulder spans and nonfinite transforms. Reinitialize smoothing when tracking resumes.

## Rendering order and limitations

Draw video, then garment, then UI framing guides. Keep controls in DOM outside canvas. This first version may draw clothing over arms or existing clothing; it does not handle occlusion or realistic sleeves. A person segmentation mask alone cannot establish arm-in-front-of-shirt depth. Do not claim it does.

Manual scale/offset controls affect appearance only. Selecting S/M/L updates cart variant selection but must not fabricate size-based fit visualization.

## Performance and reliability

Load assets once and cache safely. Throttle pose inference independently of canvas rendering. Avoid overlapping inference calls and growing frame queues. Begin at a moderate video resolution, then benchmark lower-resolution inference if needed. Disable capture until a usable frame and asset are ready.

Optional local snapshot uses a user-triggered download; do not persist it to API or localStorage. Warn if cross-origin asset configuration prevents capture.

## Validation

Test mirrored and unmirrored input, camera switch, resize, phone orientation, dim light, partial torso, multiple people, tracking loss, reconnect, model errors and route exit. Verify in network inspection that no camera frame or landmark leaves the browser. Confirm the camera indicator stops after every close path.

Sources: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js and https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
