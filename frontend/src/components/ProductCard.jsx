import { Link } from "react-router-dom";
import { inr } from "../data/products";

export default function ProductCard({ p }) {
  return (
    <article className="group flex flex-col bg-surface rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="relative aspect-[3/4] w-full bg-surface-container overflow-hidden">
        <img src={p.img} alt={p.name} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 rounded bg-surface/95 px-2 py-1 font-caption font-semibold shadow-sm">
            {p.tryOn && <span className="material-symbols-outlined text-primary-container text-[14px]">videocam</span>}
            {p.badge}
          </span>
        </div>
        {p.tryOn && (
          <Link to={`/try-on/setup?product=${p.slug}`} className="absolute inset-x-3 bottom-3 hidden group-hover:flex h-10 items-center justify-center gap-2 rounded-lg bg-black/70 text-white font-label-sm backdrop-blur hover:bg-black">
            <span className="material-symbols-outlined text-[18px]">videocam</span> Try on camera
          </Link>
        )}
      </div>
      <div className="p-space-md flex flex-col flex-1 justify-between gap-space-sm">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-product-title font-semibold group-hover:text-primary"><Link to={`/product/${p.slug}`}>{p.name}</Link></h3>
            <span className="font-label-md font-bold shrink-0">{inr(p.price)}</span>
          </div>
          <p className="font-body-sm text-secondary mt-1">{p.fabric}</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {p.colors.map((c) => (
              <span key={c.name} title={c.name} className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ background: c.hex }} />
            ))}
          </div>
          <Link to={`/product/${p.slug}`} className="font-caption font-semibold flex items-center gap-1 hover:text-primary-container">
            Preview <span className="material-symbols-outlined text-[16px]">visibility</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
