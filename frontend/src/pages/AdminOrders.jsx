import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { minorToInr } from "../lib/api";

const NEXT = { demo_placed: ["demo_confirmed", "demo_cancelled"], demo_confirmed: ["demo_completed", "demo_cancelled"] };

export default function AdminOrders() {
  const { user, authed, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = () => authed("/admin/orders").then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(load, []);

  const transition = async (id, s) => {
    setError("");
    try {
      await authed(`/admin/orders/${id}/status`, { method: "PATCH", body: { status: s } });
      load();
    } catch (e) { setError(e.message); }
  };

  if (!ready) return null;
  if (!user) return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><Link to="/login" className="underline">Login required</Link></div>;
  if (user.role !== "admin") return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><p className="font-headline-sm">Administrators only.</p></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-space-xl w-full">
      <p className="font-caption"><Link to="/admin/products" className="underline">← Products</Link></p>
      <h1 className="font-headline-lg mt-1">Admin · Demo orders</h1>
      {error && <p className="mt-2 font-body-sm text-danger" role="alert">{error}</p>}
      <div className="mt-4 space-y-2">
        {items.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 bg-surface border rounded-xl">
            <div><p className="font-product-title font-semibold">{o.order_number}</p><p className="font-caption text-secondary">{o.status} · {minorToInr(o.total_minor)}</p></div>
            <div className="flex gap-2">
              {(NEXT[o.status] ?? []).map((s) => (
                <button key={s} onClick={() => transition(o.id, s)} className="h-10 px-4 rounded-lg border font-label-sm">
                  {s === "demo_cancelled" ? "Cancel" : s.replace("demo_", "")}
                </button>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-secondary">No demo orders yet.</p>}
      </div>
    </div>
  );
}
