import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { api, minorToInr, resolveVariant } from "../lib/api";

export default function Cart() {
  const { cart, cartDetailed, updateQty, removeItem } = useShop();
  const nav = useNavigate();
  const [validation, setValidation] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (!cart.length) { setStatus("success"); setValidation(null); return; }
    setStatus("loading");
    (async () => {
      try {
        const resolved = await Promise.all(cart.map(async (c, i) => {
          try {
            const r = await resolveVariant(c.slug, c.color, c.size);
            return { ...r, qty: c.qty, index: i };
          } catch {
            return { variant_id: null, qty: c.qty, index: i, unresolvable: true };
          }
        }));
        const valid = resolved.filter((r) => r.variant_id);
        const data = valid.length
          ? await api.validateCart(valid.map((r) => ({ variant_id: r.variant_id, quantity: r.qty })))
          : { items: [], subtotal_minor: 0, shipping_minor: 0, total_minor: 0 };
        if (!live) return;
        const byVariant = new Map(data.items.map((l) => [l.variant_id, l]));
        setValidation({
          ...data,
          lines: resolved.map((r) => ({ ...r, server: r.variant_id ? byVariant.get(r.variant_id) : null })),
        });
        setStatus("success");
      } catch (e) {
        if (live) { setError(e.message); setStatus("error"); }
      }
    })();
    return () => { live = false; };
  }, [cart]);

  const count = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/" className="underline">Home</Link> / Bag ({count})</p>
      <div className="flex items-end gap-3 mt-1"><h1 className="font-headline-lg">Shopping Bag</h1><span className="font-caption bg-surface-container px-2 py-1 rounded">{cart.length} lines</span></div>
      {cart.length === 0 ? (
        <div className="mt-6 p-12 text-center bg-surface border rounded-xl"><p className="font-headline-sm">Your bag is empty</p><Link to="/shop" className="mt-3 inline-flex h-11 px-5 items-center rounded-lg bg-on-surface text-surface font-label-md">Continue shopping</Link></div>
      ) : status === "loading" ? (
        <div className="mt-6 p-12 text-center bg-surface border rounded-xl" aria-busy="true"><p className="font-body-md text-secondary">Validating prices and stock with the server…</p></div>
      ) : status === "error" ? (
        <div className="mt-6 p-12 text-center bg-surface border rounded-xl" role="alert">
          <p className="font-headline-sm">Could not validate bag</p>
          <p className="font-body-sm text-secondary">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 font-caption">Server-validated prices and stock. Demo shipping is free.</div>
            {validation.lines.map((l, i) => {
              const line = cartDetailed[i];
              const problem = l.unresolvable || (l.server && l.server.error);
              return (
                <div key={i} className={`flex gap-4 p-4 bg-surface border rounded-xl ${problem ? "border-danger" : ""}`}>
                  <img src={line.product.img} alt={line.product.name} className="w-20 h-24 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-product-title font-semibold">{l.title ?? line.product.name}</h3>
                      <span className="font-label-md font-bold">{l.server && !l.server.error ? minorToInr(l.server.line_total_minor) : "—"}</span>
                    </div>
                    <p className="font-caption text-secondary">{line.color} · Size {line.size}</p>
                    {problem && (
                      <p className="mt-1 font-caption text-danger" role="alert">
                        {l.unresolvable ? "No longer available." : l.server.error === "OUT_OF_STOCK" ? `Only ${l.server.fields?.quantity ?? "limited stock"} — lower the quantity or remove.` : "This variant is unavailable."}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-lg">
                        <button className="w-9 h-9" onClick={() => updateQty(i, line.qty - 1)}>−</button>
                        <span className="w-8 text-center font-label-md">{line.qty}</span>
                        <button className="w-9 h-9" onClick={() => updateQty(i, line.qty + 1)}>+</button>
                      </div>
                      <button onClick={() => removeItem(i)} className="font-caption underline text-secondary">Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 p-space-lg bg-surface border rounded-xl space-y-3">
              <h3 className="font-headline-sm">Order summary</h3>
              <div className="flex justify-between font-body-sm"><span>Subtotal</span><span>{minorToInr(validation.subtotal_minor)}</span></div>
              <div className="flex justify-between font-body-sm"><span>Shipping</span><span>Free</span></div>
              <div className="flex justify-between font-headline-sm border-t pt-3"><span>Total</span><span>{minorToInr(validation.total_minor)}</span></div>
              <button onClick={() => nav("/checkout")} className="w-full h-12 rounded-lg bg-primary-container text-white font-label-md font-semibold">Proceed to demo checkout</button>
              <p className="font-caption text-secondary border rounded-lg p-3 bg-amber-50">Demo checkout — no payment collected. Totals above are server-validated.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
