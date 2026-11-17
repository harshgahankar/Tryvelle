import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { startCamera, stopCamera } from "../features/try-on/camera";

// Photo try-on: the shopper uploads a photo or takes one now; the backend runs
// the mini-CatVTON model and we show the generated image.
export default function TryOnSetup() {
  const [params] = useSearchParams();
  const slug = params.get("product") ?? "white-oxford-shirt";
  const [p, setP] = useState(null);
  const [failed, setFailed] = useState(false);
  const [photo, setPhoto] = useState(null); // File/Blob chosen by the user
  const [photoUrl, setPhotoUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [state, setState] = useState("pick"); // pick | camera | ready | running | done | error
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let live = true;
    api.product(slug).then((d) => live && setP(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [slug]);

  // Free object URLs and the camera when they change or the page closes.
  useEffect(() => () => photoUrl && URL.revokeObjectURL(photoUrl), [photoUrl]);
  useEffect(() => () => resultUrl && URL.revokeObjectURL(resultUrl), [resultUrl]);
  useEffect(() => () => stopCamera(videoRef.current), []);

  const choose = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError("Choose a JPEG, PNG or WebP photo."); setState("error"); return; }
    if (file.size > 15 * 1024 * 1024) { setError("Photos must be under 15 MB."); setState("error"); return; }
    setPhoto(file); setPhotoUrl(URL.createObjectURL(file)); setResultUrl(""); setError(""); setState("ready");
  };

  const openCamera = async () => {
    setError(""); setState("camera");
    try {
      await startCamera(videoRef.current, { width: 1080, height: 1440 });
    } catch (e) {
      setError(e.message); setState("error");
    }
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.translate(c.width, 0); ctx.scale(-1, 1); // save it the way the user saw it (mirrored preview)
    ctx.drawImage(v, 0, 0);
    stopCamera(v);
    c.toBlob((b) => choose(new File([b], "camera.jpg", { type: "image/jpeg" })), "image/jpeg", 0.92);
  };

  const run = async () => {
    setState("running"); setError("");
    try {
      const color = p.colors.find((c) => c.try_on_available) ?? p.colors[0];
      const blob = await api.tryOnPhoto(p.id, color?.color_id, photo);
      setResultUrl(URL.createObjectURL(blob)); setState("done");
    } catch (e) {
      setError(e.message); setState("error");
    }
  };

  const reset = () => { stopCamera(videoRef.current); setPhoto(null); setPhotoUrl(""); setResultUrl(""); setError(""); setState("pick"); };

  if (failed) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center" role="alert">
        <p className="font-headline-sm">Garment unavailable</p>
        <Link to="/shop" className="underline">Back to shop</Link>
      </div>
    );
  }
  if (!p) {
    return <div className="max-w-5xl mx-auto px-4 py-space-xl" aria-busy="true"><div className="h-64 rounded-2xl bg-surface-container animate-pulse" /></div>;
  }
  const garmentPhoto = p.photos[0]?.url;
  const btn = "h-12 px-5 rounded-lg font-label-md font-semibold flex items-center justify-center gap-2";

  return (
    <div className="max-w-5xl mx-auto px-margin-tablet py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to={`/product/${p.slug}`} className="underline">← Back to {p.title}</Link></p>
      <div className="mt-4 rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container">checkroom</span>
          <div><h1 className="font-headline-sm">Try it on with a photo</h1><p className="font-caption text-secondary">Upload a photo of yourself or take one now — we'll show you wearing {p.title}.</p></div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Left: the photo / camera / result */}
          <div>
            <div className="relative rounded-xl overflow-hidden bg-[#121212] aspect-[3/4] flex items-center justify-center">
              <video ref={videoRef} className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${state === "camera" ? "" : "hidden"}`} muted playsInline />
              {state !== "camera" && (resultUrl || photoUrl) && (
                <img src={resultUrl || photoUrl} alt={resultUrl ? `You wearing ${p.title}` : "Your photo"} className="absolute inset-0 w-full h-full object-contain" />
              )}
              {state !== "camera" && !photoUrl && (
                <div className="text-white/70 text-center p-6">
                  <span className="material-symbols-outlined text-[48px]">person</span>
                  <p className="font-caption mt-2">Your photo will appear here</p>
                </div>
              )}
              {state === "running" && (
                <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
                  <span className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="font-label-md">Creating your try-on… this takes about 30 seconds</p>
                </div>
              )}
              {state === "done" && <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-label-sm">AI preview</span>}
            </div>
            {resultUrl && (
              <div className="mt-3 flex gap-2">
                <a href={resultUrl} download={`tryvelle-${p.slug}.jpg`} className={`${btn} flex-1 border`}><span className="material-symbols-outlined">download</span> Save image</a>
                <button onClick={() => setResultUrl("")} className={`${btn} flex-1 border`}>Show original</button>
              </div>
            )}
          </div>

          {/* Right: garment + actions */}
          <div className="space-y-4">
            <div className="flex gap-3 p-4 rounded-xl bg-surface-container-low">
              {garmentPhoto && <img src={garmentPhoto} alt={p.title} className="w-16 h-20 rounded-lg object-cover" />}
              <div><p className="font-caption uppercase text-secondary font-semibold">Selected garment</p><p className="font-product-title font-semibold">{p.title}</p><p className="font-caption text-secondary">{p.category.name}</p></div>
            </div>

            {(state === "pick" || state === "error" || state === "ready" || state === "done") && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => fileRef.current?.click()} className={`${btn} border`}><span className="material-symbols-outlined">upload</span> Upload photo</button>
                <button onClick={openCamera} className={`${btn} border`}><span className="material-symbols-outlined">photo_camera</span> Take photo</button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            )}
            {state === "camera" && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={reset} className={`${btn} border`}>Cancel</button>
                <button onClick={snap} className={`${btn} bg-primary-container hover:bg-primary text-white`}><span className="material-symbols-outlined">photo_camera</span> Capture</button>
              </div>
            )}
            {(state === "ready" || (state === "error" && photo)) && (
              <button onClick={run} className={`${btn} w-full bg-primary-container hover:bg-primary text-white`}>
                <span className="material-symbols-outlined">auto_awesome</span> Try it on
              </button>
            )}
            {state === "done" && <button onClick={run} className={`${btn} w-full border`}>Run again</button>}

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 font-body-sm" role="alert">{error}</div>}

            <div className="space-y-2">
              <p className="font-label-sm font-semibold uppercase text-secondary">For the best result</p>
              {["Stand facing the camera, one person only", "Shoulders and hips visible, arms slightly away from your body", "Good light and a plain background", "Works best with tops, kurtis and plain shirts"].map((s, i) => (
                <div key={s} className="flex gap-3"><span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-caption font-bold shrink-0">{i + 1}</span><p className="font-body-sm">{s}</p></div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 font-caption flex gap-2"><span className="material-symbols-outlined text-success text-[18px]">lock</span> Your photo is sent to our try-on service only to create this preview. It is never saved.</div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 font-caption">AI preview of style and colour — not a fit measurement. Choose your size on the product page.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
