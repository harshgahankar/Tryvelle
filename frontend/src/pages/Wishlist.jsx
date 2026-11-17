import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../store/AuthContext";
import { useWishlist } from "../store/WishlistContext";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";

// Saved items as full product cards. Un-hearting a card removes it right away
// (the shared WishlistContext is the source of truth for which ids are saved).
export default function Wishlist() {
  const { user, ready } = useAuth();
  const { ids } = useWishlist();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    api.products({ page_size: 100 })
      .then((d) => { setProducts(d.items); setStatus("success"); })
      .catch(() => setStatus("error"));
  };
  useEffect(load, []);

  if (!ready) return null;
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-space-2xl text-center">
        <span className="material-symbols-outlined text-[48px] text-secondary">favorite</span>
        <h1 className="mt-2 font-headline-sm">Save the styles you love</h1>
        <p className="mt-1 font-body-sm text-secondary">Log in to keep a wishlist across devices.</p>
        <Link to="/login" className="mt-5 inline-flex h-11 px-6 items-center rounded-lg bg-on-surface text-white font-label-md">Log in</Link>
      </div>
    );
  }

  const saved = products.filter((p) => ids.has(String(p.id)));

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-space-xl w-full">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-headline-lg">Wishlist</h1>
          <p className="font-body-sm text-secondary">{ids.size} {ids.size === 1 ? "item" : "items"} saved</p>
        </div>
        {saved.length > 0 && <Link to="/shop" className="btn-chip shrink-0">Continue shopping <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>}
      </div>

      {status === "error" && (
        <div className="mt-8 text-center">
          <p className="font-body-md">Could not load your wishlist.</p>
          <button onClick={load} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-white font-label-md">Retry</button>
        </div>
      )}

      {status === "loading" && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {Array.from({ length: Math.max(ids.size, 4) }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {status === "success" && saved.length === 0 && (
        <div className="mt-12 max-w-md mx-auto text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-surface-container-low grid place-items-center">
            <span className="material-symbols-outlined text-[40px] text-primary-container">favorite</span>
          </div>
          <h2 className="mt-4 font-headline-sm">Your wishlist is empty</h2>
          <p className="mt-1 font-body-sm text-secondary">Tap the heart on any kurti or shirt to save it here.</p>
          <Link to="/shop" className="mt-6 inline-flex h-11 px-6 items-center rounded-lg bg-on-surface text-white font-label-md">Browse the shop</Link>
        </div>
      )}

      {status === "success" && saved.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {saved.map((p) => <ProductCard key={p.id} item={p} />)}
        </div>
      )}
    </div>
  );
}
