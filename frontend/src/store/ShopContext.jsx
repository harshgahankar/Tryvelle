import { createContext, useContext, useMemo, useState } from "react";
import { products } from "../data/products";

const ShopContext = createContext(null);
export const useShop = () => useContext(ShopContext);

export function ShopProvider({ children }) {
  const [cart, setCart] = useState([
    { slug: "everyday-cotton-tee", size: "M", color: "Cream", qty: 1 },
    { slug: "heavy-canvas-chore-shirt", size: "L", color: "Ecru", qty: 1 },
  ]);
  const [wishlist, setWishlist] = useState(["washed-linen-tee"]);
  const [orders, setOrders] = useState([]);

  const cartDetailed = useMemo(
    () =>
      cart.map((c) => ({
        ...c,
        product: products.find((p) => p.slug === c.slug),
      })),
    [cart]
  );

  const subtotal = cartDetailed.reduce((s, c) => s + c.product.price * c.qty, 0);

  const addToCart = (slug, size = "M", color) => {
    const p = products.find((x) => x.slug === slug);
    setCart((prev) => {
      const i = prev.findIndex((c) => c.slug === slug && c.size === size && c.color === (color ?? p.colors[0].name));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { slug, size, color: color ?? p.colors[0].name, qty: 1 }];
    });
  };
  const updateQty = (idx, qty) =>
    setCart((prev) => (qty <= 0 ? prev.filter((_, i) => i !== idx) : prev.map((c, i) => (i === idx ? { ...c, qty } : c))));
  const removeItem = (idx) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);
  const toggleWish = (slug) =>
    setWishlist((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  const placeOrder = (info) => {
    const id = `CS-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = { id, items: cartDetailed, subtotal, ...info, date: new Date().toISOString() };
    setOrders((p) => [order, ...p]);
    clearCart();
    return order;
  };

  return (
    <ShopContext.Provider
      value={{ cart, cartDetailed, subtotal, addToCart, updateQty, removeItem, clearCart, wishlist, toggleWish, orders, placeOrder }}
    >
      {children}
    </ShopContext.Provider>
  );
}
