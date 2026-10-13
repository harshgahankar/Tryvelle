import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop pt-space-3xl pb-space-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-space-xl pb-space-2xl border-b border-border">
          <div className="lg:col-span-4 space-y-space-md">
            <span className="font-headline-sm uppercase tracking-tight text-on-surface">Clothing Studio</span>
            <p className="font-body-sm text-secondary max-w-sm">Independent garment research and tactile design. Bridging editorial form with modern digital try-on simulation.</p>
            <div className="p-space-md rounded-lg bg-surface border border-border space-y-1">
              <div className="flex items-center gap-space-xs text-on-surface">
                <span className="material-symbols-outlined text-success text-[18px]">verified_user</span>
                <span className="font-label-sm font-semibold">Local-First Privacy</span>
              </div>
              <p className="font-caption text-secondary">Camera previews are processed locally on-device and never stored or transmitted.</p>
            </div>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-space-md">
            <div className="space-y-space-sm">
              <h4 className="font-label-sm uppercase tracking-wider font-semibold">Collections</h4>
              <ul className="space-y-space-xs font-body-sm">
                {["Autumn Outerwear", "Tactile Knitwear", "Raw Denim & Chino"].map((c) => (
                  <li key={c}><Link className="text-secondary hover:text-on-surface" to="/shop">{c}</Link></li>
                ))}
              </ul>
            </div>
            <div className="space-y-space-sm">
              <h4 className="font-label-sm uppercase tracking-wider font-semibold">Studio</h4>
              <ul className="space-y-space-xs font-body-sm">
                <li><Link className="text-secondary hover:text-on-surface" to="/try-on/setup">Try-on guide</Link></li>
                <li><Link className="text-secondary hover:text-on-surface" to="/checkout">Demo checkout</Link></li>
                <li><Link className="text-secondary hover:text-on-surface" to="/cart">Shopping bag</Link></li>
              </ul>
            </div>
          </div>
          <div className="lg:col-span-4">
            <h4 className="font-label-sm uppercase tracking-wider font-semibold mb-2">Studio Dispatch</h4>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input required type="email" placeholder="Enter your email" className="flex-1 h-11 px-4 rounded-lg bg-surface border border-border font-body-sm focus:outline-none" />
              <button className="h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Join</button>
            </form>
            <p className="font-caption text-secondary mt-2">No endless sales. Only pattern notes & try-on invites.</p>
          </div>
        </div>
        <p className="font-caption text-secondary pt-space-md">Demo storefront — no payment collected. Converted from frontend.html (8 pages) to React.</p>
      </div>
    </footer>
  );
}
