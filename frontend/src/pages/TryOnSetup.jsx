import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export default function TryOnSetup() {
  const [params] = useSearchParams();
  const slug = params.get("product") ?? "everyday-cotton-tee";
  const [p, setP] = useState(null);
  const [failed, setFailed] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    api.product(slug).then((d) => live && setP(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [slug]);

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
  const photo = p.photos[0]?.url;
  return (
    <div className="max-w-5xl mx-auto px-margin-tablet py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to={`/product/${p.slug}`} className="underline">← Back to {p.title}</Link> · Step 1 of 2 — Positioning</p>
      <div className="mt-4 rounded-2xl bg-surface border border-border overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container">videocam</span>
          <div><h1 className="font-headline-sm">Try-On Setup & Positioning</h1><p className="font-caption text-secondary">Front-facing tops · one person · shoulders + torso visible</p></div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div className="space-y-4">
            <div className="flex gap-3 p-4 rounded-xl bg-surface-container-low">
              {photo && <img src={photo} alt={p.title} className="w-16 h-20 rounded-lg object-cover" />}
              <div><p className="font-caption uppercase text-secondary font-semibold">Selected garment</p><p className="font-product-title font-semibold">{p.title}</p><p className="font-caption text-secondary">{p.category.name}{p.try_on_available ? " · Try-on ready" : ""}</p></div>
            </div>
            <div className="p-4 rounded-xl bg-[#121212] text-white text-center">
              <svg viewBox="0 0 300 300" className="w-full max-w-[260px] mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="150" cy="70" rx="34" ry="44" strokeDasharray="4 4" opacity="0.6" />
                <path d="M112 105 C 80 125, 45 150, 30 195 L 55 230 L 85 190 L 85 280 L 215 280 L 215 190 L 245 230 L 270 195 C 255 150, 220 125, 188 105 Z" strokeDasharray="5 4" opacity="0.8" />
                <line x1="85" x2="215" y1="200" y2="200" strokeDasharray="2 3" opacity="0.5" />
              </svg>
              <p className="font-caption mt-2 text-white/70">Align shoulders inside dashed guides · step back · eye-level camera</p>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="font-headline-sm">Prepare your preview</h2>
            {["Good daylight, plain background", "Phone on a stand, front camera, eye level", "Step back until shoulders + torso visible", "Preview is silhouette only — not a fit measurement"].map((s, i) => (
              <div key={s} className="flex gap-3"><span className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-caption font-bold shrink-0">{i + 1}</span><p className="font-body-sm">{s}</p></div>
            ))}
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 font-caption flex gap-2"><span className="material-symbols-outlined text-success text-[18px]">lock</span> Your camera is processed on this device for live preview. It is not uploaded.</div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 font-caption">2D scale approximation only. Choose official size on the product page.</div>
            <div className="flex gap-2">
              <Link to={`/product/${p.slug}`} className="flex-1 h-12 rounded-lg border font-label-md font-semibold flex items-center justify-center">Back</Link>
              <button onClick={() => nav(`/try-on/live?product=${p.slug}`)} className="flex-[2] h-12 rounded-lg bg-primary-container hover:bg-primary text-white font-label-md font-semibold flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">videocam</span> Start camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
