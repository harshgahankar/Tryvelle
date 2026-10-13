import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products } from "../data/products";

const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);

const STORAGE_KEY = "tryvelle-cart-v1"; // guest lines only: slug/size/color/qty, never credentials

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.slug === "string" && typeof c.size === "string" &&
        typeof c.color === "string" && Number.isInteger(c.qty) && c.qty > 0 && c.qty <= 99
    );
  } catch {
    return [];
  }
}

const placeholder = (slug) => ({
  slug,
  name: slug,
  price: 0,
  fabric: "",
  category: "",
  tryOn: false,
  badge: "",
  colors: [],
  sizes: [],
  img: "",
});

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or unavailable: session-only cart */
    }
  }, [cart]);

  const cartDetailed = useMemo(
    () => cart.map((c) => ({ ...c, product: products.find((p) => p.slug === c.slug) ?? placeholder(c.slug) })),
    [cart]
  );

  const addToCart = (slug, size = "M", color) => {
    const p = products.find((x) => x.slug === slug);
    const resolvedColor = color ?? p?.colors[0]?.name ?? "One";
    setCart((prev) => {
      const i = prev.findIndex((c) => c.slug === slug && c.size === size && c.color === resolvedColor);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: Math.min(99, next[i].qty + 1) };
        return next;
      }
      return [...prev, { slug, size, color: resolvedColor, qty: 1 }];
    });
  };
  const updateQty = (idx, qty) =>
    setCart((prev) => (qty <= 0 ? prev.filter((_, i) => i !== idx) : prev.map((c, i) => (i === idx ? { ...c, qty: Math.min(99, qty) } : c))));
  const removeItem = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  return (
    <ShopContext.Provider value={{ cart, cartDetailed, addToCart, updateQty, removeItem, clearCart }}>
      {children}
    </ShopContext.Provider>
  );
}
