import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { minorToInr } from "../lib/api";

export default function OrderConfirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const order = state ?? { id, order_number: id, items: [], total_minor: 0, status: "demo_placed" };
  return (
    <div className="max-w-3xl mx-auto px-margin-tablet py-space-2xl w-full text-center">
      <span className="material-symbols-outlined text-success text-[48px]">check_circle</span>
      <p className="font-caption uppercase tracking-widest text-success font-semibold mt-2">Demo order confirmed — no payment collected</p>
      <h1 className="font-headline-lg mt-1">Thank you{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!</h1>
      <p className="font-body-md text-secondary">Order <strong className="text-on-surface">{order.order_number ?? id}</strong> · status <em>{order.status}</em>.</p>
      <div className="mt-6 text-left p-5 bg-surface border rounded-xl space-y-2">
        {(order.items ?? []).map((c, i) => (
          <div key={i} className="flex justify-between font-body-sm"><span>{c.title} · {c.color} {c.size} × {c.quantity}</span><span>{minorToInr((c.unit_price_minor ?? 0) * (c.quantity ?? 1))}</span></div>
        ))}
        <div className="flex justify-between font-headline-sm border-t pt-2"><span>Total</span><span>{minorToInr(order.total_minor ?? 0)}</span></div>
        {order.address && <p className="font-caption text-secondary">Ship to: {order.address.recipient}, {order.address.line1}, {order.address.city} {order.address.postal_code}</p>}
      </div>
      <div className="flex gap-2 justify-center mt-6">
        <Link to="/account/orders" className="h-12 px-6 inline-flex items-center rounded-lg bg-on-surface text-surface font-label-md font-semibold">View my orders</Link>
        <Link to="/shop" className="h-12 px-6 inline-flex items-center rounded-lg border font-label-md font-semibold">Continue shopping</Link>
      </div>
    </div>
  );
}
