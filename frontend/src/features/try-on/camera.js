// Camera lifecycle helper: start/stop with complete cleanup.
// Audio is never requested. Old stream is stopped before a switch.
export async function startCamera(videoEl, { deviceId, facingMode = "user", width = 1280, height = 720 } = {}) {
  if (!window.isSecureContext && location.hostname !== "localhost") {
    throw Object.assign(new Error("Camera requires HTTPS or localhost."), { code: "insecure-context" });
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("Camera API unavailable in this browser."), { code: "unsupported" });
  }
  stopCamera(videoEl);
  const constraints = {
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode }),
      width: { ideal: width },
      height: { ideal: height },
    },
    audio: false,
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    await videoEl.play().catch(() => {});
    return stream;
  } catch (e) {
    if (e?.name === "NotAllowedError") throw Object.assign(new Error("Camera permission denied. Allow access in the browser site settings, then retry."), { code: "denied" });
    if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") throw Object.assign(new Error("No camera found."), { code: "no-camera" });
    if (e?.name === "NotReadableError") throw Object.assign(new Error("Camera is busy in another app/tab."), { code: "busy" });
    throw Object.assign(new Error(e?.message || "Could not start camera."), { code: "failed" });
  }
}

export function stopCamera(videoEl) {
  const stream = videoEl?.srcObject;
  if (stream) {
    for (const t of stream.getTracks()) { try { t.stop(); } catch { /* noop */ } }
    videoEl.srcObject = null;
  }
}

export async function listCameras() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}
