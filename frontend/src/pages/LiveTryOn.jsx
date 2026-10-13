import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { products } from "../data/products";
import { useShop } from "../store/ShopContext";
import { LIVE_FEED_IMG } from "../data/products";

const SWATCHES = [
  { name: "Cream", hex: "#F4EFE6" },
  { name: "Charcoal", hex: "#2E2E2E" },
  { name: "Burgundy", hex: "#8D040F" },
];

export default function LiveTryOn() {
  const [params] = useSearchParams();
  const slug = params.get("product") ?? "everyday-cotton-tee";
  const p = products.find((x) => x.slug === slug) ?? products[0];
  const [color, setColor] = useState(SWATCHES[0]);
  const [scale, setScale] = useState(100);
  const [offsetY, setOffsetY] = useState(0);
  const [size, setSize] = useState("M");
  const [guide, setGuide] = useState(true);
  const [toast, setToast] = useState(false);
  const { addToCart } = useShop();
  const nav = useNavigate();

  const snap = () => { setToast(true); setTimeout(() => setToast(false), 1800); };

  return (
    <section className="w-full bg-camera-surface text-camera-text flex flex-col min-h-[calc(100vh-5rem)]">
      <header className="w-full px-margin-tablet lg:px-margin-desktop py-3 flex flex-wrap items-center justify-between gap-3">
        <Link to={`/product/${p.slug}`} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg font-label-md">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to {p.name}
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-product-title">{p.name} — <span className="font-normal text-white/90">{color.name}</span></span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 font-caption"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Camera active (60 FPS)</span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 font-caption"><span className="material-symbols-outlined text-[16px] text-emerald-400">lock</span> Local device processing • Not uploaded</div>
      </header>
      <div className="flex-1 w-full flex flex-col lg:flex-row min-h-0">
        <div className="relative flex-1 lg:basis-[70%] bg-[#0B0B0B] flex flex-col items-center justify-center p-space-md lg:p-space-lg">
          <div className="relative w-full max-w-5xl aspect-[16/9] rounded-xl overflow-hidden bg-[#181818] shadow-2xl">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${LIVE_FEED_IMG}')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
            {/* garment overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translateY(${offsetY}px) scale(${scale / 100})` }}>
              <svg viewBox="0 0 320 360" className="w-72 sm:w-80 md:w-96 drop-shadow-2xl" fill="none">
                <path d="M105 44 C 122 62, 198 62, 215 44 L 272 75 C 286 83, 298 94, 290 120 L 254 136 C 248 116, 240 106, 234 100 L 230 310 C 230 324, 90 324, 90 310 L 86 100 C 80 106, 72 116, 66 136 L 30 120 C 22 94, 34 83, 48 75 Z" fill={color.hex} stroke="rgba(0,0,0,0.2)" />
                <path d="M105 44 C 128 66, 192 66, 215 44" stroke="rgba(0,0,0,0.25)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            {guide && (
              <svg viewBox="0 0 300 450" className="absolute inset-0 m-auto h-[85%] text-white opacity-40" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4">
                <ellipse cx="150" cy="85" rx="38" ry="50" /><path d="M112 115 C 80 135, 45 160, 30 205 L 55 240 L 85 200 L 85 390 L 215 390 L 215 200 L 245 240 L 270 205 C 255 160, 220 135, 188 115 Z" />
              </svg>
            )}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-success px-3.5 py-1.5 rounded-full font-label-sm font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" /> Tracking: Ready • Front view locked</div>
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
              {[
                ["replay", "Reset view", () => { setScale(100); setOffsetY(0); }],
                ["cameraswitch", "Switch camera", () => {}],
                ["photo_camera", "Capture snapshot", snap],
              ].map(([icon, label, fn]) => (
                <button key={label} onClick={fn} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 hover:bg-black/90 font-label-sm backdrop-blur">
                  <span className="material-symbols-outlined text-[18px]">{icon}</span> {label}
                </button>
              ))}
            </div>
            <div className="absolute bottom-4 right-4">
              <button onClick={() => setGuide((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 font-label-sm backdrop-blur">
                <span className="material-symbols-outlined text-[18px]">view_in_ar</span> {guide ? "Hide guide" : "Show guide"}
              </button>
            </div>
            {toast && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-success text-[24px]">check_circle</span>
                <div><p className="font-label-md font-semibold">Snapshot Saved Locally</p><p className="font-caption text-secondary">Stored in browser cache only</p></div>
              </div>
            )}
          </div>
          <p className="mt-2 w-full max-w-5xl flex justify-between font-caption text-white/50"><span>2D scale approximation — choose official size below.</span><span className="hidden sm:block">Pose Estimator v3.4 (WASM client-side)</span></p>
        </div>
        <aside className="w-full lg:basis-[30%] bg-[#1A1A1A] p-space-lg flex flex-col gap-5">
          <div className="flex gap-3 p-4 bg-white/5 rounded-xl">
            <img src={p.img} alt={p.name} className="w-16 h-20 rounded-lg object-cover" />
            <div><p className="font-caption uppercase text-white/60 font-semibold">Essential Capsule</p><h2 className="font-product-title font-bold truncate">{p.name}</h2><p className="font-product-title">₹{p.price.toLocaleString("en-IN")}</p></div>
          </div>
          <div>
            <p className="font-label-sm font-semibold mb-2 text-white/80">Select Studio Colorway</p>
            <div className="flex gap-3">
              {SWATCHES.map((s) => (
                <button key={s.name} title={s.name} onClick={() => setColor(s)} className={`w-10 h-10 rounded-full p-0.5 ${color.name === s.name ? "ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A]" : ""}`}>
                  <span className="block w-full h-full rounded-full" style={{ background: s.hex }} />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="font-label-sm font-semibold text-white/80">Adjust appearance (not sizing)</p>
            <label className="block font-caption text-white/60">Overlay scale: {scale}%<input type="range" min={90} max={110} value={scale} onChange={(e) => setScale(+e.target.value)} className="w-full" /></label>
            <label className="block font-caption text-white/60">Vertical position: {offsetY}px<input type="range" min={-20} max={20} value={offsetY} onChange={(e) => setOffsetY(+e.target.value)} className="w-full" /></label>
          </div>
          <div>
            <p className="font-label-sm font-semibold mb-2 text-white/80">Choose purchase size</p>
            <div className="flex gap-2 flex-wrap">
              {["S", "M", "L", "XL"].map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`min-w-[44px] h-10 rounded-lg font-label-sm border ${size === s ? "bg-white text-black" : "bg-white/10 text-white"}`}>{s}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { addToCart(p.slug, size, color.name); nav("/cart"); }} className="h-12 rounded-lg bg-primary-container hover:bg-primary font-label-md font-semibold">Add to bag — Size {size}</button>
          <button onClick={() => nav(`/product/${p.slug}`)} className="h-11 rounded-lg bg-white/10 font-label-md">Close camera</button>
        </aside>
      </div>
    </section>
  );
}
