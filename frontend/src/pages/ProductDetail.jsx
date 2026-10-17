import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, minorToInr } from "../lib/api";
import { useAuth } from "../store/AuthContext";
import { useShop } from "../store/ShopContext";

export default function ProductDetail() {
  const { slug = "white-oxford-shirt" } = useParams();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [colorId, setColorId] = useState(null);
  const [size, setSize] = useState(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const { addToCart } = useShop();
  const { user, authed } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    setStatus("loading");
    api.product(slug)
      .then((d) => {
        if (!live) return;
        setP(d);
        setColorId(d.colors[0]?.color_id);
        const firstInStock = d.colors[0]?.variants.find((v) => v.stock_quantity > 0);
        setSize(firstInStock?.size_label ?? d.colors[0]?.variants[0]?.size_label);
        setStatus("success");
      })
      .catch((e) => live && (setError(e.message), setStatus("error")));
    return () => { live = false; };
  }, [slug]);

  if (status === "loading") {
    return <div className="max-w-7xl mx-auto px-margin-tablet py-space-2xl w-full" aria-busy="true"><div className="h-8 w-64 rounded bg-surface-container animate-pulse" /><div className="mt-4 aspect-[16/10] rounded-xl bg-surface-container animate-pulse" /></div>;
  }
  if (status === "error") {
    const missing = error.toLowerCase().includes("unavailable") || error.toLowerCase().includes("not found");
    return (
      <div className="max-w-3xl mx-auto px-margin-tablet py-space-2xl text-center" role="alert">
        <p className="font-headline-lg">{missing ? "Product unavailable" : "Could not load product"}</p>
        <p className="font-body-md text-secondary mt-2">{error} {missing && "It may be archived or the variant may not exist."}</p>
        <div className="flex gap-2 justify-center mt-4">
          <button onClick={() => window.location.reload()} className="h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Retry</button>
          <Link to="/shop" className="h-11 px-5 inline-flex items-center rounded-lg border font-label-md">Back to shop</Link>
        </div>
      </div>
    );
  }

  const color = p.colors.find((c) => c.color_id === colorId) ?? p.colors[0];
  const variant = color.variants.find((v) => v.size_label === size) ?? color.variants[0];
  const outOfStock = (variant?.stock_quantity ?? 0) === 0;
  const photos = p.photos.length ? p.photos.map((f) => f.url) : [];
  const gallery = [photos[0], ...photos.slice(1), ...photos].slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/" className="underline">Home</Link> / <Link to="/shop" className="underline">Shop</Link> / {p.title}</p>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl mt-4">
        <div className="lg:col-span-7">
          <div className="grid grid-cols-2 gap-space-sm">
            {gallery.map((src, i) => (
              <div key={i} className={`rounded-xl overflow-hidden bg-surface-container ${i === 0 ? "col-span-2 aspect-[16/10]" : "aspect-square"}`}>
                <img src={src} alt={`${p.title} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-3 p-space-md rounded-xl bg-surface-container-low font-body-sm text-secondary">{p.description}</div>
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            <span className="font-caption uppercase tracking-widest text-primary-container font-semibold">{p.category.name}</span>
            <h1 className="font-headline-lg">{p.title}</h1>
            <div className="flex items-baseline gap-2"><span className="font-headline-sm font-bold">{minorToInr(variant.price_minor)}</span><span className="font-caption text-secondary">Tax included</span></div>
            <p className="font-caption text-secondary">{p.currency} · minor-unit pricing from API</p>
            <div>
              <p className="font-label-sm font-semibold mb-2">Color: {color.name}</p>
              <div className="flex gap-2">
                {p.colors.map((c) => (
                  <button key={c.color_id} title={c.name} onClick={() => {
                    setColorId(c.color_id);
                    const s = c.variants.find((v) => v.stock_quantity > 0) ?? c.variants[0];
                    setSize(s?.size_label);
                  }} className={`w-10 h-10 rounded-full border-2 ${color.color_id === c.color_id ? "border-on-surface" : "border-transparent"} p-0.5`}>
                    <span className="block w-full h-full rounded-full border border-black/10" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-label-sm font-semibold">Size: {size}</p>
                {p.size_chart && <button onClick={() => setChartOpen(true)} className="font-caption underline">Size chart</button>}
              </div>
              <div className="flex flex-wrap gap-2">
                {color.variants.map((v) => (
                  <button key={v.variant_id} disabled={v.stock_quantity === 0} onClick={() => setSize(v.size_label)} className={`min-w-[48px] h-11 px-3 rounded-lg font-label-sm border ${size === v.size_label ? "bg-on-surface text-surface" : "bg-surface"} ${v.stock_quantity === 0 ? "opacity-40 line-through" : ""}`}>
                    {v.size_label}
                  </button>
                ))}
              </div>
              <p className="font-caption text-secondary mt-1">
                {variant.stock_quantity === 0 ? "Out of stock" : variant.stock_quantity <= 3 ? `Only ${variant.stock_quantity} left` : "In stock"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button disabled={outOfStock} onClick={() => { addToCart(p.slug, size, color.name); setAdded(true); setTimeout(() => setAdded(false), 2000); }} className="h-12 rounded-lg bg-primary-container hover:bg-primary text-white font-label-md font-semibold disabled:opacity-40">
                {outOfStock ? "Out of stock" : added ? "Added to bag ✓" : `Add to cart — ${minorToInr(variant.price_minor)}`}
              </button>
              {color.try_on_available ? (
                <button onClick={() => nav(`/try-on/setup?product=${p.slug}`)} className="h-12 rounded-lg border-2 border-on-surface font-label-md font-semibold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">videocam</span> Live camera try-on
                </button>
              ) : (
                <p className="font-caption text-secondary border rounded-lg p-3">Try-on not available for this colorway (no published asset).</p>
              )}
              <p className="font-caption text-secondary">Preview how this looks on you. This view does not measure size or guarantee fit.</p>
              {user && (
                <button onClick={async () => { await authed(`/me/wishlist/${p.id}`, { method: "PUT" }); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="font-caption underline text-left">
                  {saved ? "Saved to wishlist ✓" : "♡ Save to wishlist"}
                </button>
              )}
            </div>
            <div className="divide-y border rounded-xl bg-surface">
              {[["Shipping & returns", "Demo storefront — no shipment. Returns simulated."], ["Privacy", "Camera processed on-device, never uploaded."]].map(([t, d]) => (
                <details key={t} className="p-4"><summary className="font-label-md font-semibold cursor-pointer">{t}</summary><p className="font-body-sm text-secondary mt-1">{d}</p></details>
              ))}
            </div>
          </div>
        </div>
      </div>
      {chartOpen && p.size_chart && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setChartOpen(false)}>
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1"><h3 className="font-headline-sm">{p.size_chart.name}</h3><button onClick={() => setChartOpen(false)}><span className="material-symbols-outlined">close</span></button></div>
            <p className="font-caption text-secondary mb-3">{p.size_chart.measurement_definition}</p>
            <table className="w-full font-body-sm"><thead><tr className="text-left font-caption text-secondary"><th>Size</th><th>Chest</th><th>Length</th></tr></thead>
              <tbody>{p.size_chart.rows.map((r) => (<tr key={r.size_label} className="border-t"><td className="py-2 font-semibold">{r.size_label}</td><td>{r.chest}</td><td>{r.length}</td></tr>))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
