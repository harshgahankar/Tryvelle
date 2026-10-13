// Milestone 1 standalone camera prototype: one front-facing T-shirt.
// Real getUserMedia + MediaPipe PoseLandmarker + single-canvas similarity renderer.
// No rectangles-as-garment: without a real transparent PNG + anchors we show a
// clearly labeled missing-asset state (wireframe only) and document requirements.
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { startCamera, stopCamera, listCameras } from "../features/try-on/camera";
import { createPoseAdapter, validateGarmentMeta, REQUIRED_ASSET_DOC } from "../features/try-on/poseAdapter";
import { mapLandmarkToCanvas, validateShoulders, smoothTransform, extractShoulders, isStale, similarityFromShoulders } from "../features/try-on/geometry";
import { drawScene } from "../features/try-on/renderer";

const SAMPLE_META = {
  schema_version: 1, width: 1024, height: 1024,
  anchors: { left_shoulder: { x: 0.28, y: 0.18 }, right_shoulder: { x: 0.72, y: 0.18 }, hem_center: { x: 0.5, y: 0.88 } },
  calibration: { scale_multiplier: 1.0, offset_x: 0.0, offset_y: 0.0 },
};

export default function PrototypeTryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const garmentRef = useRef(null);
  const loopRef = useRef({ raf: 0, lastInfer: 0, lastOk: 0, smooth: null });
  const poseRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle|loading|requesting|waiting|tracking|low-confidence + error codes
  const [error, setError] = useState("");
  const [fps, setFps] = useState(0);
  const [hasGarment, setHasGarment] = useState(false);
  const [calib, setCalib] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const [showGuide, setShowGuide] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [note, setNote] = useState("");

  const cleanup = useCallback(() => {
    cancelAnimationFrame(loopRef.current.raf);
    stopCamera(videoRef.current);
    poseRef.current?.dispose?.();
    poseRef.current = null;
    loopRef.current.smooth = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => {
    const onHide = () => { if (document.hidden) { cleanup(); setStatus("idle"); setNote("Camera released on backgrounding — press Start to resume."); } };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [cleanup]);

  // Preload model + garment alongside (before camera request completes)
  const preload = useCallback(async () => {
    setStatus("loading"); setError("");
    try {
      poseRef.current = await createPoseAdapter({});
    } catch (e) {
      setStatus("model-failure"); setError(e.message); return false;
    }
    const url = import.meta.env.VITE_GARMENT_URL;
    if (url) {
      const err = validateGarmentMeta(SAMPLE_META);
      if (err) { setStatus("missing-asset"); setError(err); return false; }
      await new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { garmentRef.current = img; setHasGarment(true); res(); };
        img.onerror = () => rej(new Error("Garment asset failed to load (check CORS + URL)."));
        img.src = url;
      }).catch((e) => { setStatus("missing-asset"); setError(e.message); return false; });
    } else {
      setHasGarment(false); // labeled missing-asset state, continue with wireframe
    }
    try { setCameras(await listCameras()); } catch { /* noop */ }
    return true;
  }, []);

  const start = useCallback(async (nextDevice) => {
    cleanup();
    setNote("");
    if (!(await preload())) return;
    if (poseRef.current == null && status === "model-failure") return;
    setStatus("requesting"); // camera requested ONLY after Start action
    try {
      await startCamera(videoRef.current, { deviceId: (nextDevice ?? deviceId) || undefined });
    } catch (e) {
      const code = e.code === "denied" ? "camera-denied" : e.code === "no-camera" ? "no-camera" : e.code === "busy" ? "camera-busy" : e.code === "unsupported" || e.code === "insecure-context" ? "unsupported" : "camera-failed";
      setStatus(code); setError(e.message); cleanup(); return;
    }
    setStatus("waiting");
    const st = loopRef.current;
    st.lastOk = performance.now();
    let frames = 0, t0 = performance.now();

    const tick = async () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || video.srcObject == null) return;
      const now = performance.now();
      // render at rAF rate; inference throttled (~10Hz) with one in flight
      if (now - st.lastInfer > 100 && video.readyState >= 2) {
        st.lastInfer = now;
        try {
          const lms = await poseRef.current?.detect(video, now);
          const vw = video.videoWidth, vh = video.videoHeight;
          const rect = canvas.getBoundingClientRect();
          if (lms && vw) {
            const s = extractShoulders(lms);
            if (s) {
              // Unmirrored space: the scene mirror applies once at draw time.
              // Mirrored mapping here would force a 180-degree flip.
              const P = mapLandmarkToCanvas(s.L, vw, vh, rect.width, rect.height, false);
              const Q = mapLandmarkToCanvas(s.R, vw, vh, rect.width, rect.height, false);
              const v = validateShoulders(P, Q, s.vL, s.vR, rect.width);
              if (v.ok) {
                st.lastOk = now;
                // garment source anchors in image px (fallback: wireframe box if no asset)
                const gw = garmentRef.current?.naturalWidth || 300, gh = garmentRef.current?.naturalHeight || 340;
                const A = { x: SAMPLE_META.anchors.left_shoulder.x * gw, y: SAMPLE_META.anchors.left_shoulder.y * gh };
                const B = { x: SAMPLE_META.anchors.right_shoulder.x * gw, y: SAMPLE_META.anchors.right_shoulder.y * gh };
                const base = similarityFromShoulders(A, B, P, Q);
                if (base) {
                  st.smooth = smoothTransform(st.smooth, { s: base.s, theta: base.theta, tx: base.tx, ty: base.ty }, 100);
                  st.transform = { ...st.smooth, P, Q };
                  setStatus((prev) => (prev === "tracking" ? prev : "tracking"));
                }
              } else if (v.reason === "low-confidence") {
                setStatus("low-confidence");
              }
            }
          }
        } catch { /* keep loop alive */ }
      }
      if (isStale(st.lastOk, now)) {
        st.transform = null; st.smooth = null; // never persist stale tracking
        setStatus((p) => (p === "tracking" ? "waiting" : p));
      }
      // draw
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); }
      const ctx = canvas.getContext("2d");
      const gw = garmentRef.current?.naturalWidth || 300, gh = garmentRef.current?.naturalHeight || 340;
      drawScene(ctx, {
        video, garmentImg: garmentRef.current, showGuide,
        garmentPx: hasGarment ? { A: { x: SAMPLE_META.anchors.left_shoulder.x * gw, y: SAMPLE_META.anchors.left_shoulder.y * gh }, B: { x: SAMPLE_META.anchors.right_shoulder.x * gw, y: SAMPLE_META.anchors.right_shoulder.y * gh } } : null,
        transform: hasGarment ? st.transform : null,
        W: rect.width, H: rect.height, dpr, calib,
      });
      frames++;
      if (now - t0 > 1000) { setFps(frames); frames = 0; t0 = now; }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }, [cleanup, preload, calib, hasGarment, showGuide, deviceId, status]);

  const close = useCallback(() => { cleanup(); setStatus("idle"); setNote("Camera stopped. Tracks, loops and inference disposed."); }, [cleanup]);

  const switchCam = useCallback(async () => {
    if (cameras.length < 2) { setNote("Only one camera visible to the browser."); return; }
    const i = cameras.findIndex((c) => c.deviceId === deviceId);
    const next = cameras[(i + 1) % cameras.length].deviceId;
    setDeviceId(next);
    await start(next); // old stream stopped inside start
  }, [cameras, deviceId, start]);

  const statusLabel = { idle: "Idle", loading: "Loading model…", requesting: "Requesting camera…", waiting: "Waiting for pose…", tracking: "Tracking", "low-confidence": "Low confidence — adjust framing" }[status] ?? status;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full text-on-surface">
      <p className="font-caption text-secondary"><Link to="/" className="underline">← Store</Link> · Milestone 1 prototype (standalone, mock catalog metadata)</p>
      <h1 className="font-headline-lg mt-1">Camera prototype — one front T-shirt</h1>
      <p className="font-body-sm text-secondary max-w-2xl">Preview how this looks on you. This view does not measure size or guarantee fit. Frames + landmarks stay on-device; nothing is uploaded.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        <span className={`px-3 py-1.5 rounded-full font-label-sm ${status === "tracking" ? "bg-emerald-100 text-emerald-900" : "bg-surface-container text-on-surface"}`}>{statusLabel}{status === "tracking" ? ` · ${fps} fps` : ""}</span>
        {!hasGarment && <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 font-label-sm">Missing-asset state: wireframe only (no garment PNG configured)</span>}
      </div>

      <div className="grid lg:grid-cols-12 gap-5 mt-4">
        <div className="lg:col-span-8">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="hidden" muted playsInline />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {(status === "idle" || status.startsWith("camera") || status === "no-camera" || status === "unsupported" || status === "model-failure" || status === "missing-asset" || status === "camera-denied" || status === "camera-busy") && status !== "missing-asset" ? null : null}
            {status === "low-confidence" && <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/80 text-white font-caption">Step back so shoulders + torso are fully visible</div>}
          </div>
          {error && <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 font-body-sm"><strong>{status}:</strong> {error} {status === "camera-denied" && "Enable the camera in the browser site settings, then press Start again (we never re-prompt automatically)."}</div>}
          {note && <p className="mt-2 font-caption text-secondary">{note}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {(status === "idle" || error) && <button onClick={() => start()} className="h-12 px-6 rounded-lg bg-primary-container text-white font-label-md font-semibold">Start camera</button>}
            {(status === "tracking" || status === "waiting" || status === "low-confidence") && (<>
              <button onClick={close} className="h-11 px-5 rounded-lg border font-label-md font-semibold">Close camera</button>
              <button onClick={switchCam} className="h-11 px-5 rounded-lg border font-label-md">Switch camera</button>
              <button onClick={() => setShowGuide((v) => !v)} className="h-11 px-5 rounded-lg border font-label-md">{showGuide ? "Hide guide" : "Show guide"}</button>
            </>)}
            {cameras.length > 1 && <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className="h-11 px-3 rounded-lg border font-label-sm">{cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>)}</select>}
          </div>
          <div className="mt-3 p-4 rounded-xl bg-surface border font-body-sm space-y-1">
            <p className="font-semibold">Manual calibration (appearance only — never sizing)</p>
            <label className="block">Scale: {Math.round(calib.scale * 100)}% <input type="range" min={0.9} max={1.1} step={0.01} value={calib.scale} onChange={(e) => setCalib({ ...calib, scale: +e.target.value })} className="w-full" /></label>
            <label className="block">Horizontal offset: {calib.offsetX.toFixed(2)} span <input type="range" min={-0.2} max={0.2} step={0.01} value={calib.offsetX} onChange={(e) => setCalib({ ...calib, offsetX: +e.target.value })} className="w-full" /></label>
            <label className="block">Vertical offset: {calib.offsetY.toFixed(2)} span <input type="range" min={-0.2} max={0.2} step={0.01} value={calib.offsetY} onChange={(e) => setCalib({ ...calib, offsetY: +e.target.value })} className="w-full" /></label>
            <button onClick={() => setCalib({ scale: 1, offsetX: 0, offsetY: 0 })} className="h-10 px-4 rounded-lg border font-label-sm">Reset calibration</button>
          </div>
        </div>
        <aside className="lg:col-span-4 space-y-3">
          <div className="p-4 rounded-xl bg-surface border">
            <p className="font-label-sm font-semibold uppercase text-secondary">Required garment asset (missing)</p>
            <ul className="font-body-sm mt-1 list-disc pl-5 space-y-1">
              <li>{REQUIRED_ASSET_DOC.file}</li>
              <li>Anchors: {REQUIRED_ASSET_DOC.anchors}</li>
              <li>Calibration: {REQUIRED_ASSET_DOC.calibration}</li>
              <li>Set <code>VITE_GARMENT_URL</code> + per-color metadata; current build renders wireframe only and never a colored rectangle as a finished preview.</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-surface border font-caption text-secondary">
            <p className="font-semibold text-on-surface mb-1">Device checklist (record per test)</p>
            Laptop + phone · browser/version · camera resolution · lighting · distance · portrait/landscape · denied/no-camera/busy · partial torso · movement · route exit · background/resume · FPS + inference interval.
          </div>
        </aside>
      </div>
    </div>
  );
}
