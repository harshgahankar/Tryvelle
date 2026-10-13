import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { useAuth } from "../store/AuthContext";
import { api, authedApi, minorToInr, resolveVariant } from "../lib/api";

export default function Checkout() {
  const { cart, clearCart } = useShop();
  const { user, csrf, ready } = useAuth();
  const nav = useNavigate();
  const [validation, setValidation] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addr, setAddr] = useState({ recipient: "", line1: "", city: "", postal_code: "", country: "IN", phone: "" });
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  const [payMethod, setPayMethod] = useState("demo");
  const keyRef = useRef(null);

  const loadRazorpay = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Razorpay script failed to load. Check connection and retry."));
    document.body.appendChild(s);
  });

  useEffect(() => {
    let live = true;
    if (!cart.length) { setStatus("success"); return; }
    (async () => {
      try {
        const resolved = await Promise.all(cart.map((c) => resolveVariant(c.slug, c.color, c.size).then(
          (r) => ({ variant_id: r.variant_id, quantity: c.qty }),
          () => null)));
        const data = await api.validateCart(resolved.filter(Boolean));
        if (live) { setValidation(data); setStatus("success"); }
      } catch (e) { if (live) { setError(e.message); setStatus("error"); } }
    })();
    return () => { live = false; };
  }, [cart]);

  useEffect(() => {
    if (!ready || !user) return;
    authedApi(csrf).get("/me/addresses").then((d) => {
      setAddresses(d.items);
      if (d.items.length) setAddressId(d.items[0].id);
      else setShowAddrForm(true);
    }).catch(() => {});
  }, [ready, user, csrf]);

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await authedApi(csrf).post("/me/addresses", addr);
      setAddresses((a) => [...a, created]);
      setAddressId(created.id);
      setShowAddrForm(false);
    } catch (err) { setPlaceError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (payMethod === "razorpay") return submitRazorpay();
    if (placing || !validation || !addressId) return;
    setPlacing(true);
    setPlaceError("");
    if (!keyRef.current) keyRef.current = crypto.randomUUID(); // one key per attempt; locked while pending
    try {
      const order = await authedApi(csrf).post("/orders", {
        items: validation.items.filter((l) => !l.error).map((l) => ({ variant_id: l.variant_id, quantity: l.quantity })),
        address_id: addressId,
        expected_total_minor: validation.total_minor,
      }, { idempotencyKey: keyRef.current });
      clearCart();
      const full = await authedApi(csrf).get(`/me/orders/${order.id}`);
      nav(`/confirmation/${order.id}`, { state: full });
    } catch (err) {
      if (err.code === "PRICE_CHANGED" && err.validated) {
        // Totals moved: show server figures, mint a fresh key for the retry.
        setValidation((v) => ({ ...v, ...err.validated }));
        keyRef.current = crypto.randomUUID();
        setPlaceError("Prices or stock changed — review the updated totals, then place again.");
      } else {
        setPlaceError(err.message);
      }
    } finally {
      setPlacing(false);
    }
  };

  const submitRazorpay = async () => {
    if (placing || !validation || !addressId) return;
    setPlacing(true);
    setPlaceError("");
    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    try {
      await loadRazorpay();
      const items = validation.items.filter((l) => !l.error).map((l) => ({ variant_id: l.variant_id, quantity: l.quantity }));
      const intent = await authedApi(csrf).post("/orders/razorpay-intent", {
        items, address_id: addressId, expected_total_minor: validation.total_minor,
      }, { idempotencyKey: keyRef.current });
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: intent.key_id,
          amount: intent.total_minor,
          currency: "INR",
          name: "Tryvelle",
          description: `Order ${intent.order_number} (TEST MODE)`,
          order_id: intent.razorpay_order_id,
          handler: (resp) => resolve(resp),
          modal: { ondismiss: () => reject(new Error("Payment window closed. Your order stays pending — retry from My orders.")) },
          theme: { color: "#AF2424" },
        });
        rzp.on("payment.failed", (r) => reject(new Error(r.error?.description || "Payment failed.")));
        rzp.open();
      }).then(async (resp) => {
        await authedApi(csrf).post("/orders/verify", {
          order_id: intent.id,
          razorpay_order_id: resp.razorpay_order_id,
          razorpay_payment_id: resp.razorpay_payment_id,
          razorpay_signature: resp.razorpay_signature,
        });
        clearCart();
        const full = await authedApi(csrf).get(`/me/orders/${intent.id}`);
        nav(`/confirmation/${intent.id}`, { state: full });
      });
    } catch (err) {
      if (err.code === "PRICE_CHANGED") {
        keyRef.current = crypto.randomUUID();
        setValidation((v) => ({ ...v, ...(err.validated ? { subtotal_minor: err.validated.subtotal_minor, total_minor: err.validated.total_minor } : {}) }));
        setPlaceError("Totals changed — review and pay again.");
      } else {
        setPlaceError(err.message);
      }
    } finally {
      setPlacing(false);
    }
  };

  if (!ready) return null;
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center">
        <p className="font-headline-sm">Login to place a demo order</p>
        <p className="font-body-sm text-secondary mt-1">Guest browsing and try-on stay open; checkout needs an account.</p>
        <Link to="/login" className="mt-4 inline-flex h-11 px-6 items-center rounded-lg bg-on-surface text-surface font-label-md">Login</Link>
      </div>
    );
  }
  if (!cart.length) return <div className="max-w-3xl mx-auto p-12 text-center"><p className="font-headline-sm">Nothing to check out</p><Link to="/shop" className="underline">Back to shop</Link></div>;
  if (status === "loading") return <div className="max-w-3xl mx-auto p-12 text-center" aria-busy="true"><p className="font-body-md text-secondary">Validating your bag…</p></div>;
  if (status === "error") return <div className="max-w-3xl mx-auto p-12 text-center" role="alert"><p className="font-headline-sm">Checkout unavailable</p><p className="font-body-sm text-secondary">{error}</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop py-space-xl w-full">
      <p className="font-caption text-secondary"><Link to="/cart" className="underline">← Back to bag</Link> · Demo checkout</p>
      <div className="mt-2 p-4 rounded-xl bg-amber-50 border border-amber-200 font-body-sm">Demo order — <strong>no payment collected</strong>. Free demo delivery.</div>
      <div className="grid lg:grid-cols-12 gap-space-xl mt-6">
        <form onSubmit={submit} className="lg:col-span-7 space-y-5">
          <section className="p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">1 · Delivery address</h3>
            {addresses.map((a) => (
              <label key={a.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${addressId === a.id ? "border-on-surface bg-surface-container-low" : ""}`}>
                <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span className="font-body-sm">{a.recipient}, {a.line1}, {a.city} {a.postal_code}</span>
              </label>
            ))}
            {!showAddrForm
              ? <button type="button" onClick={() => setShowAddrForm(true)} className="font-label-sm underline">+ New address</button>
              : <div className="grid sm:grid-cols-2 gap-2">
                  <input required placeholder="Recipient" value={addr.recipient} onChange={(e) => setAddr({ ...addr, recipient: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
                  <input required placeholder="Street" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
                  <input required placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
                  <input required placeholder="PIN" value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} className="h-11 px-3 rounded-lg border font-body-sm" />
                  <button onClick={saveAddress} className="h-11 rounded-lg border font-label-md">Save address</button>
                </div>}
          </section>
          <section className="p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">2 · Payment</h3>
            <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${payMethod === "demo" ? "border-on-surface bg-surface-container-low" : ""}`}>
              <input type="radio" checked={payMethod === "demo"} onChange={() => setPayMethod("demo")} />
              <span className="font-body-sm">Demo order — no charge (<em>demo_placed</em>)</span>
            </label>
            <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${payMethod === "razorpay" ? "border-on-surface bg-surface-container-low" : ""}`}>
              <input type="radio" checked={payMethod === "razorpay"} onChange={() => setPayMethod("razorpay")} />
              <span className="font-body-sm">Pay online — Razorpay <strong>TEST MODE</strong> (UPI/cards, no real money)</span>
            </label>
          </section>
          {placeError && <p className="font-body-sm text-danger" role="alert">{placeError}</p>}
          <button disabled={placing || !addressId} className="w-full h-12 rounded-lg bg-primary-container text-white font-label-md font-semibold disabled:opacity-50">
            {placing ? "Processing… (do not double-click)" : payMethod === "razorpay" ? `Pay ${minorToInr(validation.total_minor)} (test)` : `Place demo order — ${minorToInr(validation.total_minor)}`}
          </button>
        </form>
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 p-5 bg-surface border rounded-xl space-y-3">
            <h3 className="font-headline-sm">Order review (server prices)</h3>
            {validation.items.map((l) => (
              <div key={l.variant_id} className="flex justify-between font-body-sm">
                <span>{l.error ? `${l.variant_id.slice(0, 8)}… unavailable` : `${l.title} · ${l.size} × ${l.quantity}`}</span>
                <span>{l.error ? "—" : minorToInr(l.line_total_minor)}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-1 font-body-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{minorToInr(validation.subtotal_minor)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>Free</span></div>
              <div className="flex justify-between font-headline-sm"><span>Total</span><span>{minorToInr(validation.total_minor)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
