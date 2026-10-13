import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { minorToInr } from "../lib/api";

export default function Orders() {
  const { user, authed, ready } = useAuth();
  const [data, setData] = useState({ items: [] });
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    authed("/me/orders").then((d) => { setData(d); setStatus("success"); }).catch(() => setStatus("error"));
  };
  useEffect(load, []);

  const cancel = async (id) => {
    await authed(`/me/orders/${id}/cancel`, { method: "POST" });
    load();
  };

  const payPending = async (o) => {
    if (!window.Razorpay) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = res;
        s.onerror = () => rej(new Error("Razorpay script failed to load."));
        document.body.appendChild(s);
      });
    }
    const resp = await new Promise((resolve, reject) => {
      new window.Razorpay({
        key: o.key_id, amount: o.total_minor, currency: "INR", name: "Tryvelle",
        description: `Order ${o.order_number} (TEST MODE)`, order_id: o.razorpay_order_id,
        handler: resolve,
        modal: { ondismiss: () => reject(new Error("closed")) },
        theme: { color: "#AF2424" },
      }).open();
    }).catch(() => null);
    if (!resp) return;
    await authed(`/orders/verify`, {
      method: "POST",
      body: { order_id: o.id, razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature },
    });
    load();
  };

  if (!ready) return null;
  if (!user) return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><Link to="/login" className="underline">Login required</Link></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-space-xl w-full">
      <h1 className="font-headline-lg">My orders</h1>
      <p className="font-caption text-secondary">Demo + test-mode Razorpay orders — no real money moves.</p>
      {status === "loading" && <p className="mt-4 text-secondary">Loading…</p>}
      {status === "error" && <><p className="mt-4">Could not load orders.</p><button onClick={load} className="mt-2 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Retry</button></>}
      {status === "success" && data.items.length === 0 && <p className="mt-4 text-secondary">No orders yet.</p>}
      <div className="mt-4 space-y-3">
        {data.items.map((o) => (
          <div key={o.id} className="p-4 bg-surface border rounded-xl">
            <div className="flex flex-wrap justify-between gap-2">
              <div><p className="font-product-title font-semibold">{o.order_number}</p><p className="font-caption text-secondary">{o.status} · {new Date(o.created_at).toLocaleString()}</p></div>
              <span className="font-headline-sm">{minorToInr(o.total_minor)}</span>
            </div>
            <ul className="mt-2 font-body-sm text-secondary">
              {o.items.map((i, k) => <li key={k}>{i.title} · {i.color} {i.size} × {i.quantity}</li>)}
            </ul>
            {(o.status === "demo_placed" || o.status === "demo_confirmed") && (
              <button onClick={() => cancel(o.id)} className="mt-2 font-caption underline text-secondary">Cancel order (restores stock)</button>
            )}
            {o.status === "pending_payment" && o.razorpay_order_id && (
              <button onClick={() => payPending(o)} className="mt-2 h-10 px-4 rounded-lg bg-primary-container text-white font-label-sm">Pay now (test mode)</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
