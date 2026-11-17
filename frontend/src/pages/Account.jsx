import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import { useWishlist } from "../store/WishlistContext";

const EMPTY = { recipient: "", line1: "", line2: "", city: "", region: "", postal_code: "", country: "IN", phone: "" };
const input = "h-11 px-3 rounded-lg border border-border bg-white font-body-sm w-full";
const btnDark = "h-11 px-5 rounded-lg bg-on-surface text-white font-label-md disabled:opacity-50";
const btnLight = "h-11 px-5 rounded-lg border border-border font-label-md hover:bg-surface-container-low";

function NameCard() {
  const { user, authed, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      await authed("/me", { method: "PATCH", body: { name: name.trim() } });
      await refresh();
      setEditing(false); setMsg("Name updated.");
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="p-5 sm:p-6 bg-white border border-border rounded-xl">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-primary text-white grid place-items-center text-[22px] font-bold">
          {user.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <h2 className="font-headline-sm truncate">{user.name}</h2>
          <p className="font-body-sm text-secondary truncate">{user.email}</p>
        </div>
        {user.role === "admin" && <span className="ml-auto text-[12px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-surface-container-low">Admin</span>}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-5 flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor="acc-name">Name</label>
          <input id="acc-name" required minLength={1} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <button disabled={busy || !name.trim()} className={btnDark}>{busy ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => { setEditing(false); setName(user.name); }} className={btnLight}>Cancel</button>
        </form>
      ) : (
        <button onClick={() => setEditing(true)} className={`mt-5 ${btnLight}`}>Edit name</button>
      )}
      {msg && <p className="mt-2 font-body-sm text-secondary" role="status">{msg}</p>}
    </section>
  );
}

function AddressForm({ initial, onSave, onCancel }) {
  const [a, setA] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const f = (k, label, extra = {}) => (
    <label className="flex flex-col gap-1 font-body-sm">
      <span className="text-secondary">{label}</span>
      <input value={a[k]} onChange={(e) => setA({ ...a, [k]: e.target.value })} className={input} {...extra} />
    </label>
  );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await onSave(a); } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-border bg-surface-container-lowest grid sm:grid-cols-2 gap-3">
      {f("recipient", "Full name", { required: true })}
      {f("phone", "Phone", { type: "tel", inputMode: "tel" })}
      <div className="sm:col-span-2">{f("line1", "Address line 1", { required: true })}</div>
      <div className="sm:col-span-2">{f("line2", "Address line 2 (optional)")}</div>
      {f("city", "City", { required: true })}
      {f("region", "State")}
      {f("postal_code", "PIN code", { required: true, inputMode: "numeric" })}
      {f("country", "Country")}
      {err && <p className="sm:col-span-2 text-danger font-body-sm" role="alert">{err}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button disabled={busy} className={btnDark}>{busy ? "Saving…" : "Save address"}</button>
        <button type="button" onClick={onCancel} className={btnLight}>Cancel</button>
      </div>
    </form>
  );
}

function Addresses() {
  const { authed } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [editing, setEditing] = useState(null); // null | "new" | address id

  const load = () => {
    setStatus("loading");
    authed("/me/addresses").then((d) => { setItems(d.items); setStatus("ok"); }).catch(() => setStatus("error"));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (a, id) => {
    await authed(id ? `/me/addresses/${id}` : "/me/addresses", { method: id ? "PATCH" : "POST", body: a });
    setEditing(null); load();
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    await authed(`/me/addresses/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <section className="p-5 sm:p-6 bg-white border border-border rounded-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-headline-sm">Saved addresses</h2>
        {editing !== "new" && <button onClick={() => setEditing("new")} className="font-label-md underline">+ Add address</button>}
      </div>
      <p className="font-body-sm text-secondary">Pick one of these at checkout.</p>

      <div className="mt-4 space-y-3">
        {editing === "new" && <AddressForm initial={EMPTY} onSave={(a) => save(a)} onCancel={() => setEditing(null)} />}
        {status === "loading" && <p className="text-secondary">Loading…</p>}
        {status === "error" && <p>Could not load addresses. <button onClick={load} className="underline">Retry</button></p>}
        {status === "ok" && items.length === 0 && editing !== "new" && <p className="text-secondary">No saved addresses yet.</p>}
        {items.map((a) => editing === a.id ? (
          <AddressForm key={a.id} initial={{ ...EMPTY, ...a }} onSave={(v) => save(v, a.id)} onCancel={() => setEditing(null)} />
        ) : (
          <div key={a.id} className="p-4 rounded-xl border border-border flex gap-4 justify-between">
            <div className="font-body-sm min-w-0">
              <p className="font-semibold">{a.recipient}</p>
              <p>{a.line1}{a.line2 && `, ${a.line2}`}</p>
              <p>{a.city}{a.region && `, ${a.region}`} {a.postal_code}</p>
              {a.phone && <p className="text-secondary">{a.phone}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 font-label-md">
              <button onClick={() => setEditing(a.id)} className="underline">Edit</button>
              <button onClick={() => remove(a.id)} className="underline text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Account() {
  const { user, ready, logout } = useAuth();
  const { ids } = useWishlist();
  const nav = useNavigate();

  if (!ready) return null;
  if (!user) return (
    <div className="max-w-3xl mx-auto px-4 py-space-2xl text-center">
      <p>Sign in to see your profile.</p>
      <Link to="/login" className="underline font-label-md">Login</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-space-xl w-full">
      <h1 className="font-headline-lg">My account</h1>
      <div className="mt-6 grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <NameCard />
          <Addresses />
        </div>
        <aside className="space-y-3">
          <Link to="/account/orders" className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-on-surface">
            <span className="material-symbols-outlined">package_2</span><span className="font-label-md">My orders</span>
            <span className="material-symbols-outlined ml-auto">chevron_right</span>
          </Link>
          <Link to="/wishlist" className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-on-surface">
            <span className="material-symbols-outlined">favorite</span><span className="font-label-md">Wishlist ({ids.size})</span>
            <span className="material-symbols-outlined ml-auto">chevron_right</span>
          </Link>
          {user.role === "admin" && (
            <Link to="/admin/products" className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl hover:border-on-surface">
              <span className="material-symbols-outlined">admin_panel_settings</span><span className="font-label-md">Admin</span>
              <span className="material-symbols-outlined ml-auto">chevron_right</span>
            </Link>
          )}
          <button onClick={async () => { await logout(); nav("/"); }} className={`w-full ${btnLight}`}>Log out</button>
        </aside>
      </div>
    </div>
  );
}
