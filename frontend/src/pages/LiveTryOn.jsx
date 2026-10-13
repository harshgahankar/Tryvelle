import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, minorToInr } from "../lib/api";
import { useShop } from "../store/ShopContext";
import useTryOnSession from "../features/try-on/useTryOnSession";
import { loadGarment, selectAssetForColor } from "../features/try-on/assetCache";

const FAILED = new Set(["camera-denied", "no-camera", "camera-busy", "unsupported", "model-failure", "camera-failed"]);

export default function LiveTryOn() {
  const [params] = useSearchParams();
  const slug = params.get("product") ?? "everyday-cotton-tee";
  const [p, setP] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [colorId, setColorId] = useState(null);
  const [assetNote, setAssetNote] = useState("");
  const [size, setSize] = useState("M");
  const { addToCart } = useShop();
  const nav = useNavigate();
  const s = useTryOnSession();

  useEffect(() => {
    let live = true;
    setLoadState("loading");
    api.product(slug)
      .then(async (d) => {
        if (!live) return;
        setP(d);
        setColorId(d.colors[0]?.color_id);
        const a = await api.tryOnAssets(d.id).catch(() => ({ items: [] }));
        if (!live) return;
        setAssets(a.items ?? []);
        setLoadState("success");
      })
      .catch((e) => live && (setLoadError(e.message), setLoadState("load-error")));
    return () => { live = false; };
  }, [slug]);

  // Color switch loads that colorway's published asset — camera keeps running.
  useEffect(() => {
    if (!p || !colorId) return;
    const asset = selectAssetForColor(assets, colorId);
    if (!asset) {
      s.setGarment(null);
      setAssetNote("No published try-on asset for this colorway — guides only.");
      return;
    }
    setAssetNote("");
    loadGarment(asset.asset_url)
      .then((img) => s.setGarment({ img, anchors: asset.anchors }))
      .catch(() => {
        s.setGarment(null);
        setAssetNote("Garment image failed to load — guides only.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorId, assets, p]);

  if (loadState === "loading") {
    return <section className="w-full bg-camera-surface text-camera-text min-h-[calc(100vh-5rem)] flex items-center justify-center"><p className="font-body-md text-white/70">Loading garment assets…</p></section>;
  }
  if (loadState === "load-error") {
    return (
      <section className="w-full bg-camera-surface text-camera-text min-h-[calc(100vh-5rem)] flex items-center justify-center px-4">
        <div className="text-center" role="alert">
          <p className="font-headline-sm">Could not load garment</p>
          <p className="font-body-sm text-white/60 mt-1">{loadError}</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => window.location.reload()} className="h-11 px-5 rounded-lg bg-white text-black font-label-md">Retry</button>
            <Link to="/shop" className="h-11 px-5 inline-flex items-center rounded-lg border border-white/30 font-label-md">Browse catalog instead</Link>
          </div>
        </div>
      </section>
    );
  }

  const color = p.colors.find((c) => c.color_id === colorId) ?? p.colors[0];
  const price = color.variants[0]?.price_minor ?? p.colors[0]?.variants[0]?.price_minor ?? 0;
  const failed = FAILED.has(s.status);

  return (
    <section className="w-full bg-camera-surface text-camera-text flex flex-col min-h-[calc(100vh-5rem)]">
      <header className="w-full px-4 lg:px-margin-desktop py-3 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/product/${p.slug}`} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg font-label-md min-h-[44px]">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to {p.title}
        </Link>
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          <span className="font-product-title">{p.title} — <span className="font-normal text-white/90">{color.name}</span></span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 font-caption">
            <span className={`w-2 h-2 rounded-full ${s.status === "tracking" ? "bg-emerald-500" : "bg-white/40"}`} />
            {s.status === "idle" ? "Camera off" : s.status === "tracking" ? `Tracking · ${s.fps} fps` : s.status}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 font-caption"><span className="material-symbols-outlined text-[16px] text-emerald-400">lock</span> Local device processing • Not uploaded</div>
      </header>

      <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0">
        <div className="relative flex-1 lg:basis-[70%] bg-[#0B0B0B] flex flex-col items-center justify-center p-4 lg:p-space-lg">
          <video ref={s.videoRef} className="hidden" muted playsInline />
          {s.status === "idle" && !failed ? (
            <div className="w-full max-w-5xl rounded-xl bg-[#181818] p-8 text-center">
              <p className="font-headline-sm">Preview how this looks on you.</p>
              <p className="font-body-sm text-white/60 mt-1">Camera runs on-device only. This view does not measure size or guarantee fit.</p>
              <button onClick={() => s.start()} className="mt-4 h-12 px-6 rounded-lg bg-primary-container font-label-md font-semibold min-h-[44px]">
                Start camera
              </button>
            </div>
          ) : failed ? (
            <div className="w-full max-w-5xl rounded-xl bg-[#181818] p-8 text-center" role="alert">
              <p className="font-headline-sm">
                {s.status === "camera-denied" ? "Camera permission denied" : s.status === "model-failure" ? "Preview model failed" : "Camera unavailable"}
              </p>
              <p className="font-body-sm text-white/60 mt-1">{s.error} {s.status === "camera-denied" && "Allow access in browser site settings, then retry — we never re-prompt automatically."}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <button onClick={() => s.start()} className="h-11 px-5 rounded-lg bg-white text-black font-label-md">Retry camera</button>
                <Link to={`/product/${p.slug}`} className="h-11 px-5 inline-flex items-center rounded-lg border border-white/30 font-label-md">View product photos instead</Link>
                <Link to="/shop" className="h-11 px-5 inline-flex items-center rounded-lg border border-white/30 font-label-md">Browse catalog</Link>
              </div>
              {(p.photos ?? []).length > 0 && (
                <div className="mt-4 flex gap-2 justify-center flex-wrap">
                  {p.photos.slice(0, 3).map((f, i) => <img key={i} src={f.url} alt={f.alt_text} className="w-24 h-28 rounded-lg object-cover" />)}
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden bg-[#181818] shadow-2xl">
              <canvas ref={s.canvasRef} className="absolute inset-0 w-full h-full" />
              {s.status === "low-confidence" && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/80 font-caption">Step back so shoulders + torso are fully visible</div>
              )}
              <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap">
                <button onClick={s.resetCalib} className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 font-label-sm backdrop-blur"><span className="material-symbols-outlined text-[18px]">replay</span> Reset view</button>
                <button onClick={s.switchCam} className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 font-label-sm backdrop-blur"><span className="material-symbols-outlined text-[18px]">cameraswitch</span> Switch camera</button>
              </div>
              <div className="absolute bottom-3 right-3">
                <button onClick={() => s.setShowGuide(!s.showGuide)} className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 font-label-sm backdrop-blur"><span className="material-symbols-outlined text-[18px]">view_in_ar</span> {s.showGuide ? "Hide guide" : "Show guide"}</button>
              </div>
            </div>
          )}
          {assetNote && !failed && <p className="mt-2 font-caption text-amber-300">{assetNote}</p>}
          <p className="mt-2 w-full max-w-5xl flex justify-between font-caption text-white/50"><span>2D silhouette approximation — choose official size below.</span><span className="hidden sm:block">On-device pose (WASM)</span></p>
        </div>

        <aside className="w-full lg:basis-[30%] bg-[#1A1A1A] p-4 lg:p-space-lg pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-5">
          <div className="flex gap-3 p-4 bg-white/5 rounded-xl">
            {(p.photos[0]?.url) && <img src={p.photos[0].url} alt={p.title} className="w-16 h-20 rounded-lg object-cover" />}
            <div className="min-w-0"><p className="font-caption uppercase text-white/60 font-semibold">{p.category.name}</p><h2 className="font-product-title font-bold truncate">{p.title}</h2><p className="font-product-title">{minorToInr(price)}</p></div>
          </div>
          <div>
            <p className="font-label-sm font-semibold mb-2 text-white/80">Colorway (switches live, camera stays on)</p>
            <div className="flex gap-3 flex-wrap">
              {p.colors.map((c) => {
                const has = assets.some((a) => a.color_id === c.color_id);
                return (
                  <button key={c.color_id} title={`${c.name}${has ? "" : " — no try-on asset"}`} onClick={() => setColorId(c.color_id)}
                    className={`relative w-11 h-11 rounded-full p-0.5 min-w-[44px] min-h-[44px] ${color.color_id === c.color_id ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A]" : ""}`}>
                    <span className="block w-full h-full rounded-full border border-white/20" style={{ background: c.hex }} />
                    {!has && <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black text-[10px] flex items-center justify-center" title="No asset">!</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-label-sm font-semibold text-white/80">Adjust appearance (not sizing)</p>
            <label className="block font-caption text-white/60">Overlay scale: {Math.round(s.calib.scale * 100)}%<input type="range" min={0.9} max={1.1} step={0.01} value={s.calib.scale} onChange={(e) => s.setCalib({ ...s.calib, scale: +e.target.value })} className="w-full min-h-[44px]" /></label>
            <label className="block font-caption text-white/60">Vertical offset: {s.calib.offsetY.toFixed(2)} span<input type="range" min={-0.2} max={0.2} step={0.01} value={s.calib.offsetY} onChange={(e) => s.setCalib({ ...s.calib, offsetY: +e.target.value })} className="w-full min-h-[44px]" /></label>
          </div>
          <div>
            <p className="font-label-sm font-semibold mb-2 text-white/80">Choose purchase size</p>
            <div className="flex gap-2 flex-wrap">
              {color.variants.filter((v) => v.stock_quantity > 0).map((v) => (
                <button key={v.variant_id} onClick={() => setSize(v.size_label)} className={`min-w-[44px] min-h-[44px] px-2 rounded-lg font-label-sm border ${size === v.size_label ? "bg-white text-black" : "bg-white/10 text-white"}`}>{v.size_label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { addToCart(p.slug, size, color.name); nav("/cart"); }} className="min-h-[48px] rounded-lg bg-primary-container hover:bg-primary font-label-md font-semibold">Add to bag — Size {size}</button>
          {(s.status === "tracking" || s.status === "waiting" || s.status === "low-confidence")
            ? <button onClick={s.close} className="min-h-[44px] rounded-lg bg-white/10 font-label-md">Close camera</button>
            : <button onClick={() => nav(`/product/${p.slug}`)} className="min-h-[44px] rounded-lg bg-white/10 font-label-md">Back to product</button>}
        </aside>
      </div>
    </section>
  );
}
