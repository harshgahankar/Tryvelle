import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function Wishlist() {
  const { user, authed, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");

  const load = () => {
    setStatus("loading");
    authed("/me/wishlist").then((d) => { setItems(d.items); setStatus("success"); }).catch(() => setStatus("error"));
  };
  useEffect(load, []);

  const remove = async (id) => {
    await authed(`/me/wishlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.product_id !== id));
  };

  if (!ready) return null;
  if (!user) {
    return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><p className="font-headline-sm">Login required</p><Link to="/login" className="underline">Go to login</Link></div>;
  }
  return (
    <div className="max-w-3xl mx-auto px-4 py-space-xl w-full">
      <h1 className="font-headline-lg">Wishlist</h1>
      {status === "loading" && <p className="mt-4 font-body-md text-secondary">Loading…</p>}
      {status === "error" && <><p className="mt-4 font-body-md">Could not load wishlist.</p><button onClick={load} className="mt-2 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Retry</button></>}
      {status === "success" && items.length === 0 && <p className="mt-4 font-body-md text-secondary">Empty — save products from the shop.</p>}
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.product_id} className="flex items-center justify-between p-4 bg-surface border rounded-xl">
            <Link to={`/product/${i.slug}`} className="font-product-title font-semibold">{i.title}</Link>
            <button onClick={() => remove(i.product_id)} className="font-caption underline text-secondary">Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
