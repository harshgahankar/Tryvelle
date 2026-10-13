import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { products, categories, HERO_IMG, DETAIL_IMG, TRYON_STAGE_IMG, EDITORIAL_IMG } from "../data/products";

export default function Home() {
  const arrivals = products.slice(0, 4);
  return (
    <div className="flex flex-col w-full">
      {/* SECTION 1: SPLIT EDITORIAL HERO (frontend.html ~L6-75) */}
      <section className="relative w-full max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop pt-space-xl pb-space-3xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl lg:gap-space-2xl items-center">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-space-lg">
            <div className="flex items-center gap-space-xs text-secondary">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-container" />
              <span className="font-caption uppercase tracking-widest font-semibold">Capsule 04 / Autumn In-Studio</span>
            </div>
            <h1 className="font-hero-desktop text-hero-mobile lg:text-hero-desktop tracking-tight leading-none">Find your next favourite.</h1>
            <p className="font-body-lg text-secondary max-w-xl leading-relaxed">Explore everyday pieces. Preview selected styles on camera before you choose. Tactile silhouettes designed for effortless posture and enduring ease.</p>
            <div className="pt-space-xs flex flex-wrap items-center gap-space-md">
              <Link to="/shop" className="inline-flex items-center justify-center gap-2 h-12 px-space-lg rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md transition-colors shadow-sm">
                Shop collection <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <Link to="/try-on/setup" className="inline-flex items-center gap-2 h-12 px-space-md font-label-md group">
                Learn about Try on <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
              </Link>
            </div>
            <div className="pt-space-md flex items-center gap-space-xl text-secondary">
              <div><div className="font-headline-sm font-bold text-on-surface">100%</div><div className="font-caption uppercase tracking-wider">Unprocessed Cottons</div></div>
              <div className="w-1 h-8 bg-surface-container-high rounded-full" />
              <div><div className="font-headline-sm font-bold text-on-surface">Local-First</div><div className="font-caption uppercase tracking-wider">Zero Image Telemetry</div></div>
            </div>
          </div>
          <div className="lg:col-span-5 relative mt-space-lg lg:mt-0">
            <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-surface-container-high blur-3xl pointer-events-none -z-10" />
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface-container shadow-md">
              <img src={HERO_IMG} alt="Ecru heavyweight relaxed crewneck editorial" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-space-md left-space-md text-white">
                <span className="font-caption tracking-widest uppercase opacity-80">Lookbook Plate 09</span>
                <p className="font-product-title">Heavyweight Relaxed Crewneck in Ecru</p>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-6 w-44 sm:w-56 rounded-lg bg-surface p-space-xs shadow-xl hidden sm:block">
              <div className="relative aspect-square w-full rounded overflow-hidden bg-surface-container-low mb-space-xs">
                <img src={DETAIL_IMG} alt="Fabric macro" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface font-caption font-semibold">Detail</span>
              </div>
              <div className="px-1 pb-1"><p className="font-label-sm font-semibold">380 GSM Ring-Spun</p><p className="font-caption text-secondary">Brushed fleece interior</p></div>
            </div>
            <div className="absolute top-6 -right-3 rounded-lg bg-surface/90 backdrop-blur-md px-3 py-2 shadow-md hidden md:flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-[18px]">photo_camera</span>
              <span className="font-caption font-semibold tracking-tight">Camera Simulation Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CATEGORY STRIP */}
      <section className="w-full bg-surface-container-low py-space-xl">
        <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop">
          <div className="flex items-center justify-between pb-space-md">
            <span className="font-label-sm uppercase tracking-widest text-secondary font-semibold">Studio Categories</span>
            <span className="font-caption text-secondary">4 Distinct Silhouettes</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm sm:gap-space-md">
            {categories.map((c) => (
              <Link key={c.name} to="/shop" className="group block rounded-xl bg-surface p-space-md shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-space-sm">
                  <span className={`font-caption font-semibold uppercase tracking-wider ${c.tag === "Interactive" ? "text-primary-container" : "text-secondary"}`}>{c.tag}</span>
                  <span className="material-symbols-outlined text-secondary group-hover:translate-x-0.5 transition-all text-[20px]">north_east</span>
                </div>
                <h2 className="font-product-title font-semibold group-hover:text-primary-container">{c.name}</h2>
                <p className="font-caption text-secondary mt-1">{c.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: NEW ARRIVALS */}
      <section className="w-full max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-3xl" id="new-arrivals">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-sm">
          <div><span className="font-caption uppercase tracking-widest text-primary-container font-semibold">Studio Release 01</span>
            <h2 className="font-headline-lg tracking-tight mt-1">New Arrivals</h2></div>
          <p className="font-body-md text-secondary max-w-md">Clean cuts crafted from unbleached organic yarns. Direct-from-studio batches measured with calibrated sizing.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
          {arrivals.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* SECTION 4: TRY IT ON DARK WORKSPACE */}
      <section className="w-full bg-camera-surface text-camera-text py-space-3xl" id="try-it-on">
        <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-2xl items-end">
            <div className="lg:col-span-8 space-y-space-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 font-caption"><span className="material-symbols-outlined text-warning text-[16px]">sensors</span> Local Camera Viewfinder</div>
              <h2 className="font-headline-lg max-w-2xl">See how it fits your style before ordering.</h2>
              <p className="font-body-lg text-white/70 max-w-xl">Real-time on-device camera preview for front-facing tops. Private, instant, and zero uploads.</p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <Link to="/try-on/setup" className="h-12 px-6 rounded-lg bg-primary-container hover:bg-primary text-white font-label-md font-semibold shadow-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">videocam</span> Experience live try-on
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            <div className="lg:col-span-7 bg-[#1A1A1A] rounded-xl p-space-md shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-space-sm text-white/60">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /><span className="font-caption tracking-wider uppercase">Live Feed Sim • 60 FPS</span></div>
                <span className="font-caption">1080 × 1920 Normalized</span>
              </div>
              <div className="relative aspect-video w-full rounded-lg bg-[#0E0E0E] overflow-hidden flex items-center justify-center">
                <img src={TRYON_STAGE_IMG} alt="Camera preview" className="w-full h-full object-cover opacity-60" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" viewBox="0 0 400 300"><path d="M160 80 Q200 65 240 80 Q280 110 290 180 L280 270 L120 270 L110 180 Q120 110 160 80 Z" stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" strokeWidth="1.5" /><line x1="120" x2="280" y1="120" y2="120" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" /><line x1="200" x2="200" y1="60" y2="280" stroke="rgba(255,255,255,0.2)" /><circle cx="200" cy="120" fill="#AF2424" r="4" /></svg>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-[#181818]/90 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">straighten</span>
                  <span className="font-caption text-white font-medium">Step back so your shoulders are visible</span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 p-space-sm rounded-lg bg-[#181818]/80 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded bg-[#2C2C2B] flex items-center justify-center"><span className="material-symbols-outlined text-white text-[20px]">checkroom</span></div>
                    <div><div className="font-label-sm text-white font-semibold">Everyday Cotton Tee</div><div className="font-caption text-white/60">Selected Size: M (Relaxed fit)</div></div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-white/10 font-caption text-white">Tracking lock</span>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-col gap-space-lg">
              {[["1", "Select garment", "Pick any silhouette marked with the try-on badge."], ["2", "Stand facing camera", "Enable your front camera in good daylight. Align shoulders within guidelines."], ["3", "Review look", "Inspect proportion and color pairing before adding to bag."]].map(([n, t, d]) => (
                <div key={n} className="p-space-lg rounded-lg bg-[#1A1A1A]">
                  <div className="flex items-center gap-space-md mb-1"><span className={`flex items-center justify-center w-7 h-7 rounded-full font-caption font-bold ${n === "2" ? "bg-primary-container text-white" : "bg-white/10 text-white"}`}>{n}</span><h3 className="font-headline-sm text-white">{t}</h3></div>
                  <p className="font-body-sm text-white/70 pl-11">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: PHILOSOPHY + NEWSLETTER */}
      <section className="w-full max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
          <div className="lg:col-span-7 space-y-space-md">
            <div className="flex items-center gap-2 text-primary-container"><span className="material-symbols-outlined text-[20px]">menu_book</span><span className="font-label-sm font-semibold uppercase tracking-wider">Garment Journal</span></div>
            <h2 className="font-headline-lg leading-snug">The Philosophy of Everyday Wear: Durable organic cottons and restrained silhouettes.</h2>
            <div className="space-y-space-sm text-secondary font-body-md leading-relaxed">
              <p>Clothing should not be an ephemeral costume. We engineer each piece with dense long-staple cotton yarns and calibrated seam reinforcements.</p>
              <p>By designing garments with unhurried proportion we create clothing that speaks through subtle posture rather than loud logos.</p>
            </div>
            <div className="p-space-md rounded-lg bg-surface-container-low"><p className="font-label-sm font-semibold">"Cut for presence, tailored for ease."</p><p className="font-caption text-secondary">Studio Atelier Notes, Batch Autumn 2025</p></div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="aspect-[4/5] w-full rounded-xl overflow-hidden bg-surface-container shadow-md"><img src={EDITORIAL_IMG} alt="Atelier workbench" className="w-full h-full object-cover" /></div>
            <div className="absolute -bottom-6 -left-6 bg-surface p-space-md rounded-lg shadow-lg max-w-xs hidden sm:block">
              <div className="flex items-center gap-2 text-success font-label-sm font-semibold mb-1"><span className="material-symbols-outlined text-[18px]">eco</span> GOTS-Certified Fibers</div>
              <p className="font-caption text-secondary">Pre-shrunk at low temperatures to ensure stability through repeat laundering.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="w-full max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop pb-space-3xl">
        <div className="rounded-xl bg-surface-container p-space-xl sm:p-space-2xl grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          <div className="lg:col-span-7"><span className="font-caption uppercase tracking-widest text-primary-container font-semibold">Studio Dispatch</span>
            <h2 className="font-headline-md tracking-tight">Curated capsule announcements, direct to your inbox.</h2></div>
          <div className="lg:col-span-5">
            <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => e.preventDefault()}>
              <input required type="email" placeholder="Enter your email" className="flex-1 h-12 px-4 rounded-lg bg-surface font-body-sm focus:outline-none focus:ring-2 focus:ring-on-surface" />
              <button className="h-12 px-6 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Join Gazette</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
