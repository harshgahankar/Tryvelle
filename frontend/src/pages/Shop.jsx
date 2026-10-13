import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function Shop() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [onlyTryOn, setOnlyTryOn] = useState(false);
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(3000);

  const list = useMemo(() => {
    let l = products.filter(
      (p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!onlyTryOn || p.tryOn) && p.price <= maxPrice
    );
    if (sort === "low") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "high") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [q, onlyTryOn, sort, maxPrice]);

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary">Home / Shop — REG-CAT-2025</p>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
        <div>
          <h1 className="font-headline-lg">Shop Catalog</h1>
          <p className="font-body-md text-secondary max-w-xl">Search, filter by try-on eligibility, color and price. Reset restores the full catalog.</p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 px-4 rounded-lg border border-border bg-surface font-label-sm">
          <option value="featured">Sort: Featured</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-11 px-4 rounded-lg border border-border bg-surface font-body-sm w-64" />
        <button onClick={() => setOnlyTryOn((v) => !v)} className={`h-11 px-4 rounded-lg font-label-sm border ${onlyTryOn ? "bg-on-surface text-surface" : "bg-surface"}`}>
          {onlyTryOn ? "✓ " : ""}Virtual Try-on only
        </button>
        {(q || onlyTryOn) && <button onClick={() => { setQ(""); setOnlyTryOn(false); }} className="font-label-sm underline">Clear all</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-6">
        <aside className="lg:col-span-3 space-y-6">
          <div className="p-space-md rounded-xl bg-surface border border-border">
            <h3 className="font-label-md font-semibold mb-2">Category</h3>
            {["Tops & Tees", "Relaxed Shirting", "Lightweight Knitwear", "Tailored Trousers"].map((c) => (
              <label key={c} className="flex items-center gap-2 font-body-sm py-1"><input type="checkbox" className="w-4 h-4" /> {c}</label>
            ))}
          </div>
          <div className="p-space-md rounded-xl bg-surface border border-border">
            <h3 className="font-label-md font-semibold mb-2">Max price: ₹{maxPrice}</h3>
            <input type="range" min={1200} max={3000} step={100} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full" />
            <div className="p-space-md rounded-lg bg-surface-container-low mt-3 font-caption text-secondary">Pre-shrunk, GOTS-certified fibers. Calibrated sizing.</div>
          </div>
        </aside>
        <div className="lg:col-span-9">
          {list.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-surface border border-border">
              <p className="font-headline-sm">No results</p>
              <p className="font-body-sm text-secondary">Try resetting filters.</p>
              <button onClick={() => { setQ(""); setOnlyTryOn(false); setMaxPrice(3000); }} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Reset catalog</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-lg">
              {list.map((p) => <ProductCard key={p.slug} p={p} />)}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between font-caption text-secondary">
            <span>Showing {list.length} of {products.length}</span>
            <Link to="/product/everyday-cotton-tee" className="underline">Open featured product →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
