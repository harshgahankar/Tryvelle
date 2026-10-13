import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { inr } from "../data/products";

export default function Cart() {
  const { cartDetailed, updateQty, removeItem, subtotal } = useShop();
  const nav = useNavigate();
  const shipping = cartDetailed.length ? 99 : 0;

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/" className="underline">Home</Link> / Bag ({cartDetailed.reduce((s, c) => s + c.qty, 0)})</p>
      <div className="flex items-end gap-3 mt-1"><h1 className="font-headline-lg">Shopping Bag</h1><span className="font-caption bg-surface-container px-2 py-1 rounded">{cartDetailed.length} lines</span></div>
      {cartDetailed.length === 0 ? (
        <div className="mt-6 p-12 text-center bg-surface border rounded-xl"><p className="font-headline-sm">Your bag is empty</p><Link to="/shop" className="mt-3 inline-flex h-11 px-5 items-center rounded-lg bg-on-surface text-surface font-label-md">Continue shopping</Link></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl mt-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 font-caption">Live batch assurance — calibrated sizing, GOTS fibers.</div>
            {cartDetailed.map((c, i) => (
              <div key={i} className="flex gap-4 p-4 bg-surface border rounded-xl">
                <img src={c.product.img} alt={c.product.name} className="w-20 h-24 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="flex justify-between gap-2"><h3 className="font-product-title font-semibold">{c.product.name}</h3><span className="font-label-md font-bold">{inr(c.product.price * c.qty)}</span></div>
                  <p className="font-caption text-secondary">{c.color} · Size {c.size}</p>
                  {c.product.tryOn && <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-surface-container-low font-caption"><span className="material-symbols-outlined text-[14px] text-success">videocam</span> Try-on verified</span>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border rounded-lg">
                      <button className="w-9 h-9" onClick={() => updateQty(i, c.qty - 1)}>−</button>
                      <span className="w-8 text-center font-label-md">{c.qty}</span>
                      <button className="w-9 h-9" onClick={() => updateQty(i, c.qty + 1)}>+</button>
                    </div>
                    <button onClick={() => removeItem(i)} className="font-caption underline text-secondary">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 p-space-lg bg-surface border rounded-xl space-y-3">
              <h3 className="font-headline-sm">Order summary</h3>
              <div className="flex justify-between font-body-sm"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between font-body-sm"><span>Shipping</span><span>{inr(shipping)}</span></div>
              <div className="flex justify-between font-headline-sm border-t pt-3"><span>Total</span><span>{inr(subtotal + shipping)}</span></div>
              <button onClick={() => nav("/checkout")} className="w-full h-12 rounded-lg bg-primary-container text-white font-label-md font-semibold">Proceed to demo checkout</button>
              <p className="font-caption text-secondary border rounded-lg p-3 bg-amber-50">Demo checkout — no payment collected. Server reprices at checkout.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
