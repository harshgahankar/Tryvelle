import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { products, inr, DETAIL_IMG, HERO_IMG } from "../data/products";
import { useShop } from "../store/ShopContext";

export default function ProductDetail() {
  const { slug = "everyday-cotton-tee" } = useParams();
  const p = products.find((x) => x.slug === slug) ?? products[0];
  const [color, setColor] = useState(p.colors[0].name);
  const [size, setSize] = useState("L");
  const [chartOpen, setChartOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const { addToCart } = useShop();
  const nav = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/" className="underline">Home</Link> / <Link to="/shop" className="underline">Shop</Link> / {p.name}</p>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl mt-4">
        <div className="lg:col-span-7">
          <div className="grid grid-cols-2 gap-space-sm">
            {[p.img, HERO_IMG, DETAIL_IMG, p.img].map((src, i) => (
              <div key={i} className={`rounded-xl overflow-hidden bg-surface-container ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`}>
                <img src={src} alt={`${p.name} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-3 p-space-md rounded-xl bg-surface-container-low font-body-sm text-secondary">380 GSM ring-spun cotton · brushed fleece interior · pre-shrunk. Cut for presence, tailored for ease.</div>
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            <span className="font-caption uppercase tracking-widest text-primary-container font-semibold">Essential Capsule</span>
            <h1 className="font-headline-lg">{p.name}</h1>
            <div className="flex items-baseline gap-2"><span className="font-headline-sm font-bold">{inr(p.price)}</span><span className="font-caption text-secondary">Tax included</span></div>
            <p className="font-body-sm text-secondary">{p.fabric}</p>
            <div>
              <p className="font-label-sm font-semibold mb-2">Color: {color}</p>
              <div className="flex gap-2">
                {p.colors.map((c) => (
                  <button key={c.name} title={c.name} onClick={() => setColor(c.name)} className={`w-10 h-10 rounded-full border-2 ${color === c.name ? "border-on-surface" : "border-transparent"} p-0.5`}>
                    <span className="block w-full h-full rounded-full border border-black/10" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-label-sm font-semibold">Size: {size}</p>
                <button onClick={() => setChartOpen(true)} className="font-caption underline">Size chart</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                  <button key={s} disabled={s === "XXL"} onClick={() => setSize(s)} className={`min-w-[48px] h-11 px-3 rounded-lg font-label-sm border ${size === s ? "bg-on-surface text-surface" : "bg-surface"} ${s === "XXL" ? "opacity-40 line-through" : ""}`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="font-caption text-secondary mt-1">XS low stock · XXL sold out</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { addToCart(p.slug, size, color); setAdded(true); setTimeout(() => setAdded(false), 2000); }} className="h-12 rounded-lg bg-primary-container hover:bg-primary text-white font-label-md font-semibold">
                {added ? "Added to bag ✓" : `Add to cart — ${inr(p.price)}`}
              </button>
              {p.tryOn ? (
                <button onClick={() => nav(`/try-on/setup?product=${p.slug}`)} className="h-12 rounded-lg border-2 border-on-surface font-label-md font-semibold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">videocam</span> Live camera try-on
                </button>
              ) : (
                <p className="font-caption text-secondary border rounded-lg p-3">Try-on not available for this silhouette (no validated asset).</p>
              )}
              <p className="font-caption text-secondary">Preview how this looks on you. This view does not measure size or guarantee fit.</p>
            </div>
            <div className="divide-y border rounded-xl bg-surface">
              {[["Fabric & care", "Machine wash cold, line dry. Softens with wear."], ["Shipping & returns", "Demo storefront — no shipment. Returns simulated."], ["Privacy", "Camera processed on-device, never uploaded."]].map(([t, d]) => (
                <details key={t} className="p-4"><summary className="font-label-md font-semibold cursor-pointer">{t}</summary><p className="font-body-sm text-secondary mt-1">{d}</p></details>
              ))}
            </div>
          </div>
        </div>
      </div>
      {chartOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setChartOpen(false)}>
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="font-headline-sm">Size Guide (cm)</h3><button onClick={() => setChartOpen(false)}><span className="material-symbols-outlined">close</span></button></div>
            <table className="w-full font-body-sm"><thead><tr className="text-left font-caption text-secondary"><th>Size</th><th>Chest</th><th>Length</th></tr></thead>
              <tbody>{[["XS", 100, 66], ["S", 104, 68], ["M", 108, 70], ["L", 112, 72], ["XL", 116, 74]].map((r) => (<tr key={r[0]} className="border-t"><td className="py-2 font-semibold">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
