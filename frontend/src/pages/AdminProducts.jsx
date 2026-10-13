import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

// Minimal admin console (M4): product list, draft/publish/archive, create.
// Variant + asset calibration UI lands with the full editor in M5.
export default function AdminProducts() {
  const { user, authed, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category_slug: "tops-tees", slug: "", title: "" });

  const load = () => {
    setStatus("loading");
    authed(`/admin/products${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((d) => { setItems(d.items); setStatus("success"); })
      .catch((e) => { setError(e.message); setStatus("error"); });
  };
  useEffect(load, []);

  const setProductStatus = async (id, s) => {
    try {
      await authed(`/admin/products/${id}`, { method: "PATCH", body: { status: s } });
      load();
    } catch (e) { setError(e.message); }
  };
  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await authed("/admin/products", { method: "POST", body: form });
      setForm({ category_slug: "tops-tees", slug: "", title: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  if (!ready) return null;
  if (!user) return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><Link to="/login" className="underline">Login required</Link></div>;
  if (user.role !== "admin") return <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center"><p className="font-headline-sm">Administrators only.</p></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-space-xl w-full">
      <h1 className="font-headline-lg">Admin · Products</h1>
      <div className="mt-4 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-11 px-4 rounded-lg border border-border bg-surface font-body-sm w-64" />
        <button onClick={load} className="h-11 px-5 rounded-lg border font-label-md">Search</button>
      </div>
      {error && <p className="mt-2 font-body-sm text-danger" role="alert">{error}</p>}
      {status === "loading" ? <p className="mt-4 text-secondary">Loading…</p> : (
        <ul className="mt-4 space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4 bg-surface border rounded-xl">
              <div><p className="font-product-title font-semibold">{p.title}</p><p className="font-caption text-secondary">{p.slug} · {p.category} · <strong>{p.status}</strong></p></div>
              <div className="flex gap-2">
                {p.status !== "published" && <button onClick={() => setProductStatus(p.id, "published")} className="h-10 px-4 rounded-lg bg-success text-white font-label-sm">Publish</button>}
                {p.status !== "archived" && <button onClick={() => setProductStatus(p.id, "archived")} className="h-10 px-4 rounded-lg border font-label-sm">Archive</button>}
                {p.status === "archived" && <button onClick={() => setProductStatus(p.id, "draft")} className="h-10 px-4 rounded-lg border font-label-sm">To draft</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="mt-6 p-4 bg-surface border rounded-xl grid sm:grid-cols-4 gap-2">
        <input required placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
        <input placeholder="category slug" value={form.category_slug} onChange={(e) => setForm({ ...form, category_slug: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
        <button className="h-11 rounded-lg bg-on-surface text-surface font-label-md">Create draft</button>
      </form>
    </div>
  );
}
