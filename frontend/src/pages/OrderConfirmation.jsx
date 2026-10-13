import { Link, useLocation, useParams } from "react-router-dom";
import { inr } from "../data/products";

export default function OrderConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const order = state ?? { id, items: [], subtotal: 0, total: 0, name: "Guest" };
  return (
    <div className="max-w-3xl mx-auto px-margin-tablet py-space-2xl w-full text-center">
      <span className="material-symbols-outlined text-success text-[48px]">check_circle</span>
      <p className="font-caption uppercase tracking-widest text-success font-semibold mt-2">Demo order confirmed — no payment collected</p>
      <h1 className="font-headline-lg mt-1">Thank you{order.name ? `, ${order.name.split(" ")[0]}` : ""}!</h1>
      <p className="font-body-md text-secondary">Order <strong className="text-on-surface">{order.id ?? id}</strong> is recorded as a demo. Status: <em>demo — pending</em>.</p>
      <div className="mt-6 text-left p-5 bg-surface border rounded-xl space-y-2">
        {(order.items ?? []).map((c, i) => (
          <div key={i} className="flex justify-between font-body-sm"><span>{c.product?.name} · {c.size} × {c.qty}</span><span>{inr((c.product?.price ?? 0) * c.qty)}</span></div>
        ))}
        <div className="flex justify-between font-headline-sm border-t pt-2"><span>Total</span><span>{inr(order.total ?? order.subtotal ?? 0)}</span></div>
        {order.address && <p className="font-caption text-secondary">Ship to: {order.address}, {order.city} {order.pin}</p>}
      </div>
      <div className="flex gap-2 justify-center mt-6">
        <Link to="/shop" className="h-12 px-6 inline-flex items-center rounded-lg bg-on-surface text-surface font-label-md font-semibold">Continue shopping</Link>
        <Link to="/" className="h-12 px-6 inline-flex items-center rounded-lg border font-label-md font-semibold">Back home</Link>
      </div>
    </div>
  );
}
