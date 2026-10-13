import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { inr } from "../data/products";

export default function Checkout() {
  const { cartDetailed, subtotal, placeOrder } = useShop();
  const [method, setMethod] = useState("standard");
  const [form, setForm] = useState({ name: "", email: "", address: "", city: "", pin: "" });
  const nav = useNavigate();
  const shipping = method === "express" ? 199 : 99;
  const total = subtotal + shipping;

  const submit = (e) => {
    e.preventDefault();
    const order = placeOrder({ ...form, method, total });
    nav(`/confirmation/${order.id}`, { state: order });
  };

  if (!cartDetailed.length) return <div className="max-w-3xl mx-auto p-12 text-center"><p className="font-headline-sm">Nothing to check out</p><Link to="/shop" className="underline">Back to shop</Link></div>;

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/cart" className="underline">← Back to bag</Link> · Demo checkout</p>
      <div className="mt-2 p-4 rounded-xl bg-amber-50 border border-amber-200 font-body-sm">Demo order — <strong>no payment collected</strong>. Address + stock validated, server reprices.</div>
      <div className="grid lg:grid-cols-12 gap-space-xl mt-6">
        <form onSubmit={submit} className="lg:col-span-7 space-y-5">
          <section className="p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">1 · Contact</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-12 px-4 rounded-lg border border-border font-body-sm" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-12 px-4 rounded-lg border border-border font-body-sm" />
            </div>
          </section>
          <section className="p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">2 · Delivery address</h3>
            <input required placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="h-12 px-4 rounded-lg border border-border font-body-sm w-full" />
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-12 px-4 rounded-lg border border-border font-body-sm" />
              <input required placeholder="PIN code" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="h-12 px-4 rounded-lg border border-border font-body-sm" />
            </div>
          </section>
          <section className="p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">3 · Delivery method</h3>
            {[["standard", "Standard (3–5 days)", 99], ["express", "Express (1–2 days)", 199]].map(([v, l, pr]) => (
              <label key={v} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${method === v ? "border-on-surface bg-surface-container-low" : ""}`}>
                <span className="flex items-center gap-2 font-body-sm"><input type="radio" checked={method === v} onChange={() => setMethod(v)} /> {l}</span><span className="font-label-md">{inr(pr)}</span>
              </label>
            ))}
          </section>
          <section className="p-5 bg-surface border rounded-xl">
            <h3 className="font-headline-sm">4 · Payment simulation</h3>
            <p className="font-body-sm text-secondary">No cards. This demo records an order with status <em>demo — no charge</em>.</p>
          </section>
          <button className="w-full h-12 rounded-lg bg-primary-container text-white font-label-md font-semibold">Place demo order — {inr(total)}</button>
        </form>
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">Order review</h3>
            {cartDetailed.map((c, i) => (
              <div key={i} className="flex gap-3 items-center">
                <img src={c.product.img} alt="" className="w-12 h-14 rounded object-cover" />
                <div className="flex-1"><p className="font-label-sm font-semibold">{c.product.name}</p><p className="font-caption text-secondary">{c.color} · {c.size} × {c.qty}</p></div>
                <span className="font-label-sm">{inr(c.product.price * c.qty)}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-1 font-body-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{inr(shipping)}</span></div>
              <div className="flex justify-between font-headline-sm"><span>Total</span><span>{inr(total)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
