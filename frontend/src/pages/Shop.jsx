import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { api, toCard } from "../lib/api";

const SORTS = { featured: "featured", low: "price_asc", high: "price_desc" };

export default function Shop() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(params.get("q") ?? "");
  const [onlyTryOn, setOnlyTryOn] = useState(false);
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(3000);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let live = true;
    setStatus("loading");
    api.products({ q: debouncedQ, max_price_minor: maxPrice * 100, sort: SORTS[sort], page, page_size: 9 })
      .then((d) => live && (setData(d), setStatus("success")))
      .catch((e) => live && (setError(e.message), setStatus("error")));
    return () => { live = false; };
  }, [debouncedQ, sort, maxPrice, page, retry]);

  const list = data.items.filter((p) => !onlyTryOn || p.try_on_available);
  const reset = () => { setQ(""); setOnlyTryOn(false); setMaxPrice(3000); setSort("featured"); setPage(1); };

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary">Home / Shop — live API</p>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
        <div>
          <h1 className="font-headline-lg">Shop Catalog</h1>
          <p className="font-body-md text-secondary max-w-xl">Search, filter by try-on eligibility and price, served by the catalog API. Reset restores the full catalog.</p>
        </div>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="h-11 px-4 rounded-lg border border-border bg-surface font-label-sm">
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
        {(q || onlyTryOn) && <button onClick={reset} className="font-label-sm underline">Clear all</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-6">
        <aside className="lg:col-span-3 space-y-6">
          <div className="p-space-md rounded-xl bg-surface border border-border">
            <h3 className="font-label-md font-semibold mb-2">Max price: ₹{maxPrice}</h3>
            <input type="range" min={1200} max={3000} step={100} value={maxPrice} onChange={(e) => { setMaxPrice(+e.target.value); setPage(1); }} className="w-full" />
            <div className="p-space-md rounded-lg bg-surface-container-low mt-3 font-caption text-secondary">Sample catalog — prices from the API in minor units.</div>
          </div>
        </aside>
        <div className="lg:col-span-9">
          {status === "loading" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-lg" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="aspect-[3/4] rounded-xl bg-surface-container animate-pulse" />)}
            </div>
          )}
          {status === "error" && (
            <div className="p-12 text-center rounded-xl bg-surface border border-border" role="alert">
              <p className="font-headline-sm">Catalog unavailable</p>
              <p className="font-body-sm text-secondary">{error}</p>
              <button onClick={() => setRetry((r) => r + 1)} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md" >Retry</button>
            </div>
          )}
          {status === "success" && list.length === 0 && (
            <div className="p-12 text-center rounded-xl bg-surface border border-border">
              <p className="font-headline-sm">No results</p>
              <p className="font-body-sm text-secondary">Try resetting filters.</p>
              <button onClick={reset} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Reset catalog</button>
            </div>
          )}
          {status === "success" && list.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-lg">
              {list.map((p) => <ProductCard key={p.slug} p={toCard(p)} />)}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between font-caption text-secondary">
            <span>Showing {list.length} of {data.total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 h-9 rounded border disabled:opacity-40">← Prev</button>
              <span className="h-9 px-2 inline-flex items-center">Page {page}</span>
              <button disabled={list.length === 0 || data.total <= page * 9} onClick={() => setPage((p) => p + 1)} className="px-3 h-9 rounded border disabled:opacity-40">Next →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
