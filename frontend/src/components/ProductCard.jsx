import { Link } from "react-router-dom";
import { minorToInr } from "../lib/api";
import { useWishlist } from "../store/WishlistContext";
import { sortSizes } from "../lib/sizes";

const FILLED = { fontVariationSettings: "'FILL' 1" };

// Takes a raw API list item. Second photo shows on hover (desktop).
export default function ProductCard({ item }) {
  const { has, toggle } = useWishlist();
  const saved = has(item.id);
  const [p1, p2] = item.photos ?? [];
  const sizes = sortSizes([...new Set(item.colors.flatMap((c) => c.variants.filter((v) => v.stock_quantity > 0).map((v) => v.size_label)))]);
  const soldOut = sizes.length === 0;
  return (
    <article className="group relative flex flex-col bg-surface">
      <Link to={`/product/${item.slug}`} className="relative block aspect-[3/4] w-full bg-surface-container overflow-hidden rounded-md">
        {p1 && <img src={p1.url} alt={p1.alt_text || item.title} loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${p2 ? "sm:group-hover:opacity-0" : ""}`} />}
        {p2 && <img src={p2.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300" />}
        {item.try_on_available && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary-container shadow-sm">
            <span className="material-symbols-outlined text-[14px]">videocam</span> TRY ON
          </span>
        )}
        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1.5 text-center text-[12px] font-semibold text-secondary">OUT OF STOCK</span>}
      </Link>
      <button
        onClick={() => toggle(item.id)}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={saved}
        className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center hover:scale-105 transition-transform"
      >
        <span className={`material-symbols-outlined text-[20px] ${saved ? "text-primary-container" : "text-on-surface"}`} style={saved ? FILLED : undefined}>favorite</span>
      </button>
      <div className="pt-2.5 pb-1 px-0.5">
        <p className="text-[13px] font-bold text-on-surface">Tryvelle</p>
        <h3 className="text-[13px] text-secondary truncate"><Link to={`/product/${item.slug}`}>{item.title}</Link></h3>
        <p className="mt-1 text-[14px] font-bold">{minorToInr(item.min_price_minor)}</p>
        <p className="mt-0.5 text-[11px] text-secondary truncate">{soldOut ? "Sold out" : `Sizes: ${sizes.join(", ")}`}</p>
        {item.try_on_available && (
          <Link to={`/try-on/setup?product=${item.slug}`} className="mt-2 flex sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 h-9 items-center justify-center gap-1.5 rounded border border-on-surface text-[12px] font-semibold tracking-wide hover:bg-on-surface hover:text-surface transition">
            <span className="material-symbols-outlined text-[16px]">videocam</span> TRY IT ON
          </Link>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[3/4] rounded-md bg-surface-container animate-pulse" />
      <div className="mt-2.5 h-3 w-1/3 rounded bg-surface-container animate-pulse" />
      <div className="mt-2 h-3 w-2/3 rounded bg-surface-container animate-pulse" />
      <div className="mt-2 h-3 w-1/4 rounded bg-surface-container animate-pulse" />
    </div>
  );
}
