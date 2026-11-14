import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);
export const useWishlist = () => useContext(WishlistContext);

// Server-backed wishlist (logged-in shoppers). Guests are sent to login.
export function WishlistProvider({ children }) {
  const { user, authed } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const nav = useNavigate();

  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    authed("/me/wishlist")
      .then((d) => setIds(new Set(d.items.map((i) => String(i.product_id)))))
      .catch(() => { /* keep empty */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggle = useCallback(async (productId) => {
    if (!user) { nav("/login"); return; }
    const id = String(productId);
    const had = ids.has(id);
    const flip = (add) => setIds((s) => { const n = new Set(s); if (add) n.add(id); else n.delete(id); return n; });
    flip(!had);
    try {
      await authed(`/me/wishlist/${id}`, { method: had ? "DELETE" : "PUT" });
    } catch {
      flip(had);
    }
  }, [ids, user, authed, nav]);

  return <WishlistContext.Provider value={{ ids, toggle, has: (id) => ids.has(String(id)) }}>{children}</WishlistContext.Provider>;
}
