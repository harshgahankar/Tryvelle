// Shared live-preview session: camera lifecycle, pose inference, single-canvas
// similarity renderer. Used by the integrated LiveTryOn page; the M1
// PrototypeTryOn page keeps its own inline copy as the milestone reference.
import { useCallback, useEffect, useRef, useState } from "react";
import { startCamera, stopCamera, listCameras } from "./camera";
import { createPoseAdapter } from "./poseAdapter";
import {
  mapLandmarkToCanvas, validateShoulders, smoothTransform,
  extractShoulders, isStale, similarityFromShoulders,
} from "./geometry";
import { drawScene } from "./renderer";
import { anchorPoints } from "./assetCache";

export default function useTryOnSession() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const garmentRef = useRef(null); // { img, anchors } | null
  const calibRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const guideRef = useRef(true);
  const loopRef = useRef({ raf: 0, lastInfer: 0, lastOk: 0, smooth: null, transform: null });
  const poseRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [fps, setFps] = useState(0);
  const [calib, setCalibState] = useState(calibRef.current);
  const [showGuide, setShowGuideState] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [deviceId, setDeviceId] = useState("");

  const setCalib = useCallback((c) => { calibRef.current = c; setCalibState(c); }, []);
  const resetCalib = useCallback(() => setCalib({ scale: 1, offsetX: 0, offsetY: 0 }), [setCalib]);
  const setShowGuide = useCallback((v) => { guideRef.current = v; setShowGuideState(v); }, []);
  const setGarment = useCallback((g) => { garmentRef.current = g; }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(loopRef.current.raf);
    stopCamera(videoRef.current);
    poseRef.current?.dispose?.();
    poseRef.current = null;
    loopRef.current.smooth = null;
    loopRef.current.transform = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) {
        cleanup();
        setStatus("idle");
        setNote("Camera released on backgrounding — press Start to resume.");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [cleanup]);

  const start = useCallback(async (nextDevice) => {
    cleanup();
    setNote("");
    setError("");
    setStatus("loading");
    try {
      poseRef.current = await createPoseAdapter({});
    } catch (e) {
      setStatus("model-failure");
      setError(e.message);
      return;
    }
    try {
      setCameras(await listCameras());
    } catch { /* noop */ }
    setStatus("requesting"); // camera requested ONLY after the Start action
    try {
      await startCamera(videoRef.current, { deviceId: (nextDevice ?? deviceId) || undefined });
    } catch (e) {
      const code = e.code === "denied" ? "camera-denied" : e.code === "no-camera" ? "no-camera"
        : e.code === "busy" ? "camera-busy"
        : e.code === "unsupported" || e.code === "insecure-context" ? "unsupported" : "camera-failed";
      setStatus(code);
      setError(e.message);
      cleanup();
      return;
    }
    setStatus("waiting");
    const st = loopRef.current;
    st.lastOk = performance.now();
    let frames = 0;
    let t0 = performance.now();

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.srcObject == null) return;
      const now = performance.now();
      if (now - st.lastInfer > 100 && video.readyState >= 2) {
        st.lastInfer = now;
        try {
          const lms = await poseRef.current?.detect(video, now);
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const rect = canvas.getBoundingClientRect();
          if (lms && vw) {
            const s = extractShoulders(lms);
            if (s) {
              // Transform math runs in UNMIRRORED space: the canvas mirror is
              // applied once to the whole scene at draw time. Mapping here
              // with mirrored=true forces a 180-degree flip (rotation cannot
              // represent a reflection). Anchors use wearer anatomy.
              const P = mapLandmarkToCanvas(s.L, vw, vh, rect.width, rect.height, false);
              const Q = mapLandmarkToCanvas(s.R, vw, vh, rect.width, rect.height, false);
              const v = validateShoulders(P, Q, s.vL, s.vR, rect.width);
              if (v.ok) {
                st.lastOk = now;
                const g = garmentRef.current;
                let A;
                let B;
                if (g) {
                  const pts = anchorPoints(g.anchors, g.img.naturalWidth, g.img.naturalHeight);
                  A = pts.A;
                  B = pts.B;
                } else {
                  A = { x: 0, y: 0 };
                  B = { x: 100, y: 0 };
                }
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
        st.transform = null;
        st.smooth = null; // never persist stale tracking
        setStatus((p) => (p === "tracking" ? "waiting" : p));
      }
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }
      const ctx = canvas.getContext("2d");
      const g = garmentRef.current;
      drawScene(ctx, {
        video,
        garmentImg: g?.img ?? null,
        showGuide: guideRef.current,
        garmentPx: g ? anchorPoints(g.anchors, g.img.naturalWidth, g.img.naturalHeight) : null,
        transform: g ? st.transform : null,
        W: rect.width,
        H: rect.height,
        dpr,
        calib: calibRef.current,
      });
      frames += 1;
      if (now - t0 > 1000) {
        setFps(frames);
        frames = 0;
        t0 = now;
      }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }, [cleanup, deviceId]);

  const close = useCallback(() => {
    cleanup();
    setStatus("idle");
    setNote("Camera stopped. Tracks, loops and inference disposed.");
  }, [cleanup]);

  const switchCam = useCallback(async () => {
    if (cameras.length < 2) {
      setNote("Only one camera visible to the browser.");
      return;
    }
    const i = cameras.findIndex((c) => c.deviceId === deviceId);
    const next = cameras[(i + 1) % cameras.length].deviceId;
    setDeviceId(next);
    await start(next); // old stream stopped inside start
  }, [cameras, deviceId, start]);

  return {
    status, error, note, fps, videoRef, canvasRef,
    start, close, switchCam, cameras, deviceId, setDeviceId,
    calib, setCalib, resetCalib, showGuide, setShowGuide, setGarment,
  };
}
