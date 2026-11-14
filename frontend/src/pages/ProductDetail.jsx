import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, minorToInr } from "../lib/api";
import { useShop } from "../store/ShopContext";
import { useWishlist } from "../store/WishlistContext";
import ProductCard from "../components/ProductCard";
import { sizeCompare } from "../lib/sizes";

const FILLED = { fontVariationSettings: "'FILL' 1" };

export default function ProductDetail() {
  const { slug = "white-oxford-shirt" } = useParams();
  const [p, setP] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [colorId, setColorId] = useState(null);
  const [size, setSize] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [added, setAdded] = useState(false);
  const [similar, setSimilar] = useState([]);
  const { addToCart } = useShop();
  const { has, toggle } = useWishlist();
  const nav = useNavigate();

  useEffect(() => {
    let live = true;
    setStatus("loading");
    setAdded(false);
    setSize(null);
    window.scrollTo(0, 0);
    api.product(slug)
      .then((d) => {
        if (!live) return;
        setP(d);
        setColorId(d.colors[0]?.color_id);
        setStatus("success");
        api.products({ category: d.category.slug, page_size: 12 })
          .then((r) => live && setSimilar(r.items.filter((i) => i.slug !== d.slug).slice(0, 10)))
          .catch(() => {});
      })
      .catch((e) => live && (setError(e.message), setStatus("error")));
    return () => { live = false; };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 w-full grid lg:grid-cols-[1.4fr_1fr] gap-8" aria-busy="true">
        <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded bg-surface-container animate-pulse" />)}</div>
        <div className="space-y-3"><div className="h-7 w-1/2 rounded bg-surface-container animate-pulse" /><div className="h-5 w-2/3 rounded bg-surface-container animate-pulse" /><div className="h-8 w-1/3 rounded bg-surface-container animate-pulse" /></div>
      </div>
    );
  }
  if (status === "error") {
    const missing = /unavailable|not found/i.test(error);
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center" role="alert">
        <p className="text-[22px] font-bold">{missing ? "This product is no longer available" : "Could not load product"}</p>
        <p className="text-[14px] text-secondary mt-2">{error}</p>
        <div className="flex gap-2 justify-center mt-5">
          <button onClick={() => window.location.reload()} className="h-11 px-6 rounded-md bg-on-surface text-white text-[13px] font-bold uppercase">Retry</button>
          <Link to="/shop" className="h-11 px-6 inline-flex items-center rounded-md border border-on-surface text-[13px] font-bold uppercase">Continue shopping</Link>
        </div>
      </div>
    );
  }

  const color = p.colors.find((c) => c.color_id === colorId) ?? p.colors[0];
  const variant = color.variants.find((v) => v.size_label === size);
  const price = variant?.price_minor ?? Math.min(...color.variants.map((v) => v.price_minor));
  const allOut = color.variants.every((v) => v.stock_quantity === 0);
  const saved = has(p.id);
  const photos = p.photos.map((f) => f.url);

  const addToBag = () => {
    if (added) { nav("/cart"); return; }
    if (!variant) { setSizeError(true); return; }
    addToCart(p.slug, size, color.name);
    setAdded(true);
  };

  const bagLabel = allOut ? "Out of stock" : added ? "Go to bag" : "Add to bag";

  return (
    <div className="w-full pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 w-full">
        <p className="text-[13px] text-secondary">
          <Link to="/" className="hover:underline">Home</Link> / <Link to={`/shop?category=${p.category.slug}`} className="hover:underline">{p.category.name}</Link> / <span className="text-on-surface font-semibold">{p.title}</span>
        </p>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-10 mt-4">
          {/* Gallery: swipe row on mobile, 2-col grid on desktop */}
          <div>
            <div className="flex lg:grid lg:grid-cols-2 gap-2 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 lg:mx-0 lg:px-0">
              {photos.map((src, i) => (
                <button key={src + i} onClick={() => setZoom(i)} className="relative shrink-0 w-[85%] sm:w-[48%] lg:w-auto snap-center aspect-[3/4] rounded overflow-hidden bg-surface-container cursor-zoom-in">
                  <img src={src} alt={`${p.title} view ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-28 self-start">
            <p className="text-[22px] font-bold">Tryvelle</p>
            <h1 className="text-[18px] text-secondary">{p.title}</h1>
            <div className="border-b border-border pb-4 mt-4">
              <p className="text-[24px] font-bold">{minorToInr(price)}</p>
              <p className="text-[13px] font-semibold text-[#03a685]">inclusive of all taxes</p>
            </div>

            {color.try_on_available ? (
              <Link to={`/try-on/setup?product=${p.slug}`} className="mt-5 flex items-center gap-4 rounded-xl bg-camera-surface text-white p-4 group">
                <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0"><span className="material-symbols-outlined">videocam</span></span>
                <span className="flex-1">
                  <span className="block text-[15px] font-bold">Try it on with your camera</span>
                  <span className="block text-[12px] text-white/70">See this {color.name.toLowerCase()} {p.category.name.toLowerCase().replace(/s$/, "")} on you, live. Nothing is uploaded.</span>
                </span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            ) : (
              <p className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-[13px] text-secondary">
                <span className="material-symbols-outlined text-[18px]">videocam_off</span> Live try-on isn’t available for this colour yet.
              </p>
            )}

            {p.colors.length > 1 && (
              <div className="mt-6">
                <p className="text-[14px] font-bold uppercase">More colours</p>
                <div className="flex gap-3 mt-3">
                  {p.colors.map((c) => (
                    <button key={c.color_id} title={c.name} aria-label={c.name} onClick={() => { setColorId(c.color_id); setSize(null); setAdded(false); }}
                      className={`w-11 h-11 rounded-full p-0.5 border-2 ${color.color_id === c.color_id ? "border-primary-container" : "border-transparent"}`}>
                      <span className="block w-full h-full rounded-full border border-black/10" style={{ background: c.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center gap-6">
                <p className="text-[14px] font-bold uppercase">Select size</p>
                {p.size_chart && <button onClick={() => setChartOpen(true)} className="text-[13px] font-bold uppercase text-primary-container">Size chart ›</button>}
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {[...color.variants].sort((a, b) => sizeCompare(a.size_label, b.size_label)).map((v) => {
                  const out = v.stock_quantity === 0;
                  return (
                    <div key={v.variant_id} className="relative">
                      <button disabled={out} onClick={() => { setSize(v.size_label); setSizeError(false); setAdded(false); }} aria-pressed={size === v.size_label}
                        className={`min-w-[50px] h-[50px] px-3 rounded-full border text-[14px] font-bold transition ${size === v.size_label ? "border-primary-container text-primary-container" : "border-border hover:border-primary-container"} ${out ? "text-secondary/50 bg-surface-container-low line-through cursor-not-allowed" : ""}`}>
                        {v.size_label}
                      </button>
                      {!out && v.stock_quantity <= 3 && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#ff905a] px-1 text-[10px] font-bold text-white">{v.stock_quantity} left</span>}
                    </div>
                  );
                })}
              </div>
              {sizeError && <p className="mt-3 text-[13px] font-semibold text-primary-container" role="alert">Please select a size</p>}
            </div>

            <div className="hidden lg:flex gap-3 mt-7">
              <button disabled={allOut} onClick={addToBag} className="flex-[1.4] h-14 rounded-md bg-primary-container hover:bg-primary text-white text-[15px] font-bold uppercase inline-flex items-center justify-center gap-2 disabled:opacity-50">
                <span className="material-symbols-outlined">{added ? "arrow_forward" : "shopping_bag"}</span> {bagLabel}
              </button>
              <button onClick={() => toggle(p.id)} className="flex-1 h-14 rounded-md border border-border hover:border-on-surface text-[15px] font-bold uppercase inline-flex items-center justify-center gap-2">
                <span className={`material-symbols-outlined ${saved ? "text-primary-container" : ""}`} style={saved ? FILLED : undefined}>favorite</span> {saved ? "Wishlisted" : "Wishlist"}
              </button>
            </div>
            {added && <p className="mt-3 text-[13px] font-semibold text-[#03a685]">Added to bag — size {size}, {color.name}.</p>}

            <div className="mt-7 border-t border-border pt-5">
              <p className="text-[14px] font-bold uppercase flex items-center gap-2">Product details <span className="material-symbols-outlined text-[18px]">description</span></p>
              <p className="text-[14px] text-on-surface/80 mt-2 leading-relaxed whitespace-pre-line">{p.description}</p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 text-[14px] text-on-surface/80">
              <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">verified</span> Colour: {color.name}</p>
              <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">lock</span> Camera try-on runs on your device only</p>
            </div>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 lg:px-8 mt-14 w-full">
          <h2 className="text-[16px] font-bold uppercase tracking-wide mb-5">Similar products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-8 sm:gap-x-5">
            {similar.map((i) => <ProductCard key={i.slug} item={i} />)}
          </div>
        </section>
      )}

      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border flex gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button onClick={() => toggle(p.id)} className="flex-1 h-12 rounded-md border border-border text-[13px] font-bold uppercase inline-flex items-center justify-center gap-1.5">
          <span className={`material-symbols-outlined text-[20px] ${saved ? "text-primary-container" : ""}`} style={saved ? FILLED : undefined}>favorite</span> Wishlist
        </button>
        <button disabled={allOut} onClick={addToBag} className="flex-[1.4] h-12 rounded-md bg-primary-container text-white text-[13px] font-bold uppercase inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
          <span className="material-symbols-outlined text-[20px]">shopping_bag</span> {bagLabel}
        </button>
      </div>

      {zoom !== null && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" onClick={() => setZoom(null)} role="dialog" aria-modal="true" aria-label="Image viewer">
          <button className="absolute top-4 right-4 text-white" aria-label="Close"><span className="material-symbols-outlined text-[32px]">close</span></button>
          {photos.length > 1 && <button onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + photos.length) % photos.length); }} className="absolute left-2 sm:left-6 text-white p-2" aria-label="Previous"><span className="material-symbols-outlined text-[40px]">chevron_left</span></button>}
          <img src={photos[zoom]} alt={p.title} className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 && <button onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % photos.length); }} className="absolute right-2 sm:right-6 text-white p-2" aria-label="Next"><span className="material-symbols-outlined text-[40px]">chevron_right</span></button>}
        </div>
      )}

      {chartOpen && p.size_chart && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setChartOpen(false)} role="dialog" aria-modal="true" aria-label="Size chart">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1"><h3 className="text-[18px] font-bold">{p.size_chart.name}</h3><button onClick={() => setChartOpen(false)} aria-label="Close"><span className="material-symbols-outlined">close</span></button></div>
            <p className="text-[13px] text-secondary mb-4">{p.size_chart.measurement_definition}</p>
            <table className="w-full text-[14px]">
              <thead><tr className="text-left text-[12px] uppercase text-secondary"><th className="py-2">Size</th><th>Chest</th><th>Length</th></tr></thead>
              <tbody>{p.size_chart.rows.map((r) => (
                <tr key={r.size_label} className={`border-t border-border ${r.size_label === size ? "bg-[#fff6f4]" : ""}`}><td className="py-2.5 font-bold">{r.size_label}</td><td>{r.chest}</td><td>{r.length}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
