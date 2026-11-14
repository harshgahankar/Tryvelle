import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { api } from "../lib/api";

function useCatalog() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api.products({ page_size: 60 })
      .then((d) => live && setItems(d.items))
      .catch((e) => live && (setError(e.message), setItems([])));
    return () => { live = false; };
  }, []);
  return { items, error };
}

const photo = (p, i = 0) => p?.photos?.[i]?.url ?? p?.photos?.[0]?.url;

function HeroCarousel({ items }) {
  const slides = useMemo(() => {
    const shirts = items.filter((p) => p.category.slug === "shirts");
    const kurtis = items.filter((p) => p.category.slug === "kurtis");
    const tryon = items.filter((p) => p.try_on_available);
    return [
      { key: "tryon", dark: true, eyebrow: "Only at Tryvelle", title: "Try it on. Live.", text: "Point your camera, pick a style, and see it on you in real time — before it reaches your bag.", cta: "Shop try-on styles", to: "/shop?tryon=1", pics: tryon.slice(0, 3) },
      { key: "kurtis", eyebrow: "New season", title: "Kurtis for every day", text: "Chikankari, prints, A-lines and easy kaftans.", cta: "Shop kurtis", to: "/shop?category=kurtis", pics: kurtis.slice(0, 3) },
      { key: "shirts", eyebrow: "Wardrobe staples", title: "Shirts that work hard", text: "Linen, oxford, denim and checks — office to weekend.", cta: "Shop shirts", to: "/shop?category=shirts", pics: shirts.slice(0, 3) },
    ].filter((s) => s.pics.length);
  }, [items]);
  const [i, setI] = useState(0);
  const paused = useRef(false);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => { if (!paused.current) setI((x) => (x + 1) % slides.length); }, 5500);
    return () => clearInterval(t);
  }, [slides.length]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];

  return (
    <section className="max-w-7xl mx-auto w-full px-4 lg:px-8 pt-4" aria-roledescription="carousel"
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
      <div className={`relative overflow-hidden rounded-xl ${s.dark ? "bg-camera-surface text-white" : "bg-[#f3e9e2] text-on-surface"} transition-colors`}>
        <div key={s.key} className="grid md:grid-cols-2 items-center gap-6 p-6 sm:p-10 lg:p-14 min-h-[380px] animate-[fadeIn_.5s_ease]">
          <div>
            <p className={`text-[12px] font-bold uppercase tracking-[0.2em] ${s.dark ? "text-[#ff8a80]" : "text-primary-container"}`}>{s.eyebrow}</p>
            <h1 className="font-headline-lg text-[34px] leading-[40px] sm:text-[48px] sm:leading-[54px] mt-2">{s.title}</h1>
            <p className={`mt-3 text-[15px] max-w-md ${s.dark ? "text-white/70" : "text-secondary"}`}>{s.text}</p>
            <Link to={s.to} className={`mt-6 inline-flex h-12 items-center gap-2 px-7 rounded-md text-[14px] font-bold uppercase tracking-wide ${s.dark ? "bg-white text-black hover:bg-white/90" : "bg-on-surface text-white hover:bg-black"}`}>
              {s.cta} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {s.pics.map((p, k) => (
              <Link key={p.slug} to={`/product/${p.slug}`} className={`block rounded-lg overflow-hidden aspect-[3/4] bg-white/10 ${k === 1 ? "translate-y-4" : ""}`}>
                <img src={photo(p)} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </Link>
            ))}
          </div>
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((x, k) => (
              <button key={x.key} onClick={() => setI(k)} aria-label={`Show slide ${k + 1}`} aria-current={k === i}
                className={`h-2 rounded-full transition-all ${k === i ? "w-6" : "w-2"} ${s.dark ? (k === i ? "bg-white" : "bg-white/40") : (k === i ? "bg-on-surface" : "bg-on-surface/30")}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionTitle({ children, to, link = "View all" }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <h2 className="text-[18px] sm:text-[22px] font-bold uppercase tracking-[0.12em]">{children}</h2>
      {to && <Link to={to} className="text-[13px] font-semibold text-primary-container hover:underline">{link} →</Link>}
    </div>
  );
}

export default function Home() {
  const { items, error } = useCatalog();
  const loading = items === null;
  const list = items ?? [];
  const tryon = list.filter((p) => p.try_on_available);
  const byCat = (slug) => list.find((p) => p.category.slug === slug);
  const cats = [
    { slug: "shirts", name: "Shirts", sub: "Men", p: byCat("shirts"), to: "/shop?category=shirts" },
    { slug: "kurtis", name: "Kurtis", sub: "Women", p: byCat("kurtis"), to: "/shop?category=kurtis" },
    { slug: "tryon", name: "Try-On Ready", sub: `${tryon.length} styles`, p: tryon[0], to: "/shop?tryon=1" },
    { slug: "under", name: "Under ₹1,500", sub: "Budget picks", p: [...list].sort((a, b) => a.min_price_minor - b.min_price_minor).find((p) => p !== tryon[0] && p.min_price_minor <= 150000), to: "/shop?max=1500" },
  ];

  return (
    <div className="flex flex-col w-full pb-12">
      {loading ? (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 pt-4"><div className="h-[380px] rounded-xl bg-surface-container animate-pulse" /></div>
      ) : <HeroCarousel items={list} />}

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-6" role="alert">
          <div className="rounded-lg border border-border bg-surface-container-low p-4 text-[14px]">Catalog is offline right now: {error}</div>
        </div>
      )}

      <section className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-white p-4 text-[13px]">
          {[["videocam", "Live camera try-on", "Runs on your device — never uploaded"], ["straighten", "Size chart on every style", "Pick the right fit the first time"], ["shopping_bag", "Bag saved on this device", "Come back any time"]].map(([i, t, d]) => (
            <div key={t} className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container">{i}</span>
              <div><p className="font-bold">{t}</p><p className="text-secondary text-[12px]">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-12">
        <SectionTitle>Shop by category</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {cats.map((c) => (
            <Link key={c.slug} to={c.to} className="group relative block aspect-[4/5] rounded-xl overflow-hidden bg-surface-container">
              {c.p && <img src={photo(c.p)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4 text-white">
                <p className="text-[11px] uppercase tracking-widest text-white/80">{c.sub}</p>
                <p className="text-[18px] font-bold">{c.name}</p>
                <p className="text-[12px] font-semibold mt-1 opacity-0 group-hover:opacity-100 transition">Shop now →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {(loading || tryon.length > 0) && (
        <section className="mt-14 bg-camera-surface text-white py-10">
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#ff8a80]">Try before you buy</p>
                <h2 className="text-[24px] sm:text-[30px] font-bold mt-1">See it on you in seconds</h2>
                <ol className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-white/70">
                  <li>1 · Pick a style</li><li>2 · Allow camera</li><li>3 · Step back, see it live</li>
                </ol>
              </div>
              <Link to="/shop?tryon=1" className="self-start md:self-auto h-11 inline-flex items-center px-6 rounded-md bg-white text-black text-[13px] font-bold uppercase tracking-wide">All try-on styles</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x pb-2 -mx-4 px-4 [scrollbar-width:thin]">
              {(loading ? [0, 1, 2, 3, 4] : tryon).map((p, k) => loading ? (
                <div key={k} className="w-44 sm:w-52 shrink-0 aspect-[3/4] rounded-lg bg-white/10 animate-pulse" />
              ) : (
                <div key={p.slug} className="w-44 sm:w-52 shrink-0 snap-start">
                  <Link to={`/try-on/setup?product=${p.slug}`} className="group relative block aspect-[3/4] rounded-lg overflow-hidden bg-white/5">
                    <img src={photo(p)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute bottom-2 inset-x-2 h-9 flex items-center justify-center gap-1.5 rounded-md bg-white/95 text-black text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">videocam</span> TRY IT ON
                    </span>
                  </Link>
                  <p className="mt-2 text-[13px] truncate">{p.title}</p>
                  <p className="text-[14px] font-bold">₹{(p.min_price_minor / 100).toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-14">
        <SectionTitle to="/shop">Trending now</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-8 sm:gap-x-5">
          {loading
            ? Array.from({ length: 10 }, (_, k) => <ProductCardSkeleton key={k} />)
            : list.slice(0, 10).map((p) => <ProductCard key={p.slug} item={p} />)}
        </div>
      </section>

      <section className="max-w-7xl mx-auto w-full px-4 lg:px-8 mt-14">
        <SectionTitle>Shop by budget</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1300, 1500, 1800, 2000].map((m) => (
            <Link key={m} to={`/shop?max=${m}`} className="rounded-xl border-2 border-dashed border-primary-container/40 bg-[#fff6f4] hover:bg-[#ffece8] p-5 text-center transition">
              <p className="text-[12px] uppercase tracking-widest text-secondary">Under</p>
              <p className="text-[26px] font-extrabold text-primary-container">₹{m.toLocaleString("en-IN")}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
