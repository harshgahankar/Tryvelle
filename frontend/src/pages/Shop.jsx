import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { api } from "../lib/api";
import { sortSizes } from "../lib/sizes";

const PAGE = 20;
const SORTS = [["featured", "Recommended"], ["price_asc", "Price: Low to High"], ["price_desc", "Price: High to Low"]];
const PRICES = [[0, 1300], [1300, 1600], [1600, 1900], [1900, 2500]];
const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;

// Facets (categories / colours / sizes) come from the whole catalog once.
function useFacets() {
  const [f, setF] = useState({ categories: [], colors: [], sizes: [] });
  useEffect(() => {
    Promise.all([api.categories(), api.products({ page_size: 100 })]).then(([c, p]) => {
      const colors = new Map();
      const sizes = new Set();
      p.items.forEach((i) => i.colors.forEach((col) => {
        colors.set(col.name, col.hex);
        col.variants.forEach((v) => sizes.add(v.size_label));
      }));
      setF({
        categories: c.items,
        colors: [...colors].map(([name, hex]) => ({ name, hex })),
        sizes: sortSizes(sizes),
      });
    }).catch(() => { /* filters just stay empty */ });
  }, []);
  return f;
}

function Group({ title, children }) {
  return (
    <div className="py-5 border-b border-border">
      <p className="text-[13px] font-bold uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Check({ checked, onChange, children, type = "checkbox" }) {
  return (
    <label className="flex items-center gap-2.5 text-[14px] cursor-pointer select-none">
      <input type={type} checked={checked} onChange={onChange} className="w-4 h-4 accent-[#af2424]" />
      {children}
    </label>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const facets = useFacets();
  const filters = {
    q: params.get("q") ?? "",
    category: params.get("category") ?? "",
    color: params.get("color") ?? "",
    size: params.get("size") ?? "",
    tryon: params.get("tryon") === "1",
    min: params.get("min") ? +params.get("min") : null,
    max: params.get("max") ? +params.get("max") : null,
    sort: params.get("sort") ?? "featured",
  };
  const key = params.toString();
  const [pages, setPages] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [drawer, setDrawer] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPages(1); }, [key]);

  useEffect(() => {
    let live = true;
    setStatus((s) => (pages === 1 ? "loading" : s === "success" ? "more" : s));
    api.products({
      q: filters.q, category: filters.category, color: filters.color, size: filters.size,
      try_on: filters.tryon ? "true" : "",
      min_price_minor: filters.min != null ? filters.min * 100 : "",
      max_price_minor: filters.max != null ? filters.max * 100 : "",
      sort: filters.sort, page: pages, page_size: PAGE,
    })
      .then((d) => {
        if (!live) return;
        setData((prev) => ({ total: d.total, items: pages === 1 ? d.items : [...prev.items, ...d.items] }));
        setStatus("success");
      })
      .catch((e) => live && (setError(e.message), setStatus("error")));
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pages, retry]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === "" || v == null || v === false ? next.delete(k) : next.set(k, v === true ? "1" : String(v))));
    setParams(next, { replace: false });
  };
  const clearAll = () => setParams(filters.q ? { q: filters.q } : {});

  const catName = facets.categories.find((c) => c.slug === filters.category)?.name;
  const title = filters.q ? `Results for “${filters.q}”` : filters.tryon ? "Try-On Studio" : catName ?? "All products";
  const chips = useMemo(() => [
    catName && { label: catName, clear: { category: "" } },
    filters.tryon && { label: "Try-on available", clear: { tryon: "" } },
    filters.color && { label: filters.color, clear: { color: "" } },
    filters.size && { label: `Size ${filters.size}`, clear: { size: "" } },
    (filters.min != null || filters.max != null) && {
      label: filters.min != null && filters.max != null ? `${rupees(filters.min)} – ${rupees(filters.max)}` : filters.max != null ? `Under ${rupees(filters.max)}` : `Over ${rupees(filters.min)}`,
      clear: { min: "", max: "" },
    },
  ].filter(Boolean), [catName, filters.tryon, filters.color, filters.size, filters.min, filters.max]);

  const sidebar = (
    <div>
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <p className="text-[15px] font-bold uppercase">Filters</p>
        {chips.length > 0 && <button onClick={clearAll} className="text-[13px] font-bold text-primary-container uppercase">Clear all</button>}
      </div>
      <Group title="Try-on">
        <Check checked={filters.tryon} onChange={() => set({ tryon: !filters.tryon })}>
          <span className="material-symbols-outlined text-[18px] text-primary-container">videocam</span> Live try-on available
        </Check>
      </Group>
      <Group title="Category">
        <Check type="radio" checked={!filters.category} onChange={() => set({ category: "" })}>All</Check>
        {facets.categories.map((c) => (
          <Check key={c.slug} type="radio" checked={filters.category === c.slug} onChange={() => set({ category: c.slug })}>{c.name}</Check>
        ))}
      </Group>
      <Group title="Price">
        {PRICES.map(([lo, hi]) => {
          const on = (filters.min ?? 0) === lo && filters.max === hi;
          return <Check key={hi} checked={on} onChange={() => set(on ? { min: "", max: "" } : { min: lo || "", max: hi })}>{lo ? `${rupees(lo)} to ${rupees(hi)}` : `Under ${rupees(hi)}`}</Check>;
        })}
      </Group>
      {facets.sizes.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s} onClick={() => set({ size: filters.size === s ? "" : s })} aria-pressed={filters.size === s}
                className={`min-w-11 h-9 px-2 rounded-full border text-[13px] font-semibold ${filters.size === s ? "border-primary-container text-primary-container bg-[#fff6f4]" : "border-border hover:border-on-surface"}`}>{s}</button>
            ))}
          </div>
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title="Colour">
          <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
            {facets.colors.map((c) => (
              <Check key={c.name} type="radio" checked={filters.color === c.name} onChange={() => set({ color: filters.color === c.name ? "" : c.name })}>
                <span className="w-4 h-4 rounded-full border border-black/15" style={{ background: c.hex }} /> {c.name}
              </Check>
            ))}
          </div>
        </Group>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-5 w-full">
      <p className="text-[13px] text-secondary"><Link to="/" className="hover:underline">Home</Link> / <span className="text-on-surface font-semibold">{title}</span></p>
      <div className="mt-1 flex items-baseline gap-2">
        <h1 className="text-[18px] font-bold">{title}</h1>
        <span className="text-[15px] text-secondary">- {data.total} items</span>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8 mt-4">
        <aside className="hidden lg:block sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">{sidebar}</aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-border">
            <button onClick={() => setDrawer(true)} className="lg:hidden h-10 px-4 inline-flex items-center gap-1.5 rounded-md border border-border text-[13px] font-bold uppercase">
              <span className="material-symbols-outlined text-[18px]">tune</span> Filter{chips.length ? ` (${chips.length})` : ""}
            </button>
            {chips.map((c) => (
              <button key={c.label} onClick={() => set(c.clear)} className="h-8 pl-3 pr-2 inline-flex items-center gap-1 rounded-full border border-border bg-white text-[13px] hover:border-on-surface">
                {c.label} <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            ))}
            <label className="ml-auto inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border text-[14px]">
              <span className="text-secondary">Sort by:</span>
              <select value={filters.sort} onChange={(e) => set({ sort: e.target.value === "featured" ? "" : e.target.value })} className="font-bold bg-transparent focus:outline-none">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>

          {status === "error" && (
            <div className="py-16 text-center" role="alert">
              <p className="text-[18px] font-bold">Couldn’t load products</p>
              <p className="text-[14px] text-secondary mt-1">{error}</p>
              <button onClick={() => setRetry((r) => r + 1)} className="mt-4 h-11 px-6 rounded-md bg-on-surface text-white text-[13px] font-bold uppercase">Retry</button>
            </div>
          )}
          {status === "loading" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-5" aria-busy="true">
              {Array.from({ length: 8 }, (_, k) => <ProductCardSkeleton key={k} />)}
            </div>
          )}
          {(status === "success" || status === "more") && data.items.length === 0 && (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-secondary">search_off</span>
              <p className="text-[18px] font-bold mt-2">No matches</p>
              <p className="text-[14px] text-secondary mt-1">Try removing a filter or searching for something else.</p>
              <button onClick={() => setParams({})} className="mt-4 h-11 px-6 rounded-md bg-on-surface text-white text-[13px] font-bold uppercase">Show all products</button>
            </div>
          )}
          {(status === "success" || status === "more") && data.items.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-5 mt-5">
                {data.items.map((p) => <ProductCard key={p.slug} item={p} />)}
              </div>
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-[13px] text-secondary">Showing {data.items.length} of {data.total}</p>
                {data.items.length < data.total && (
                  <button disabled={status === "more"} onClick={() => setPages((n) => n + 1)} className="h-11 px-10 rounded-md border-2 border-on-surface text-[13px] font-bold uppercase hover:bg-on-surface hover:text-white disabled:opacity-50">
                    {status === "more" ? "Loading…" : "Load more"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-white flex flex-col">
            <div className="flex-1 overflow-y-auto p-5">{sidebar}</div>
            <div className="p-4 border-t border-border">
              <button onClick={() => setDrawer(false)} className="w-full h-12 rounded-md bg-primary-container text-white text-[14px] font-bold uppercase">Show {data.total} results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
