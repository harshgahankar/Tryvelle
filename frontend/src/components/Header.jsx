import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { useAuth } from "../store/AuthContext";
import { useWishlist } from "../store/WishlistContext";

const NAV = [
  { to: "/shop?category=shirts", label: "Shirts", match: (s) => s.get("category") === "shirts" },
  { to: "/shop?category=kurtis", label: "Kurtis", match: (s) => s.get("category") === "kurtis" },
  { to: "/shop?tryon=1", label: "Try-On Studio", accent: true, match: (s) => s.get("tryon") === "1" },
  { to: "/shop", label: "Shop all", match: (s) => !s.get("category") && !s.get("tryon") },
];

function IconLink({ to, icon, label, badge }) {
  return (
    <Link to={to} aria-label={label} className="flex flex-col items-center px-2 py-1 text-on-surface hover:text-primary-container">
      <span className="relative material-symbols-outlined text-[24px] leading-none">
        {icon}
        {badge > 0 && <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-container text-white text-[10px] font-bold flex items-center justify-center font-body-md">{badge}</span>}
      </span>
      <span className="hidden md:block text-[11px] font-semibold mt-0.5 max-w-16 truncate">{label}</span>
    </Link>
  );
}

export default function Header() {
  const { cart } = useShop();
  const { user, logout } = useAuth();
  const { ids } = useWishlist();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [menu, setMenu] = useState(false);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const urlQ = params.get("q") ?? "";
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setQ(urlQ); setMenu(false); }, [urlQ, loc.pathname]);

  const submit = (e) => {
    e.preventDefault();
    nav(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  const search = (
    <form onSubmit={submit} role="search" className="relative w-full">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Search products"
        placeholder="Search for shirts, kurtis and more"
        className="w-full h-10 pl-10 pr-4 bg-surface-container-low rounded-md border border-transparent text-[14px] placeholder:text-secondary focus:outline-none focus:bg-white focus:border-border" />
    </form>
  );
  const onShop = loc.pathname === "/shop";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="bg-on-surface text-white text-center text-[12px] h-8 leading-8 px-4 truncate">
        <span className="material-symbols-outlined text-[14px] align-[-2px] mr-1">videocam</span>
        See it on you first — try any style on your own photo with AI. <Link to="/shop?tryon=1" className="inline-flex items-center gap-0.5 font-semibold hover:opacity-80">Explore <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
      </div>
      <div className="h-16 max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-4 lg:gap-8">
        <button className="lg:hidden -ml-1 p-1" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><span className="material-symbols-outlined">{menu ? "close" : "menu"}</span></button>
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Tryvelle home"><img src="/brand/tryvelle-mark.svg" alt="" className="h-8 w-8" /><span className="font-headline-sm text-[20px] uppercase tracking-[0.12em]">Tryvelle</span></Link>
        <nav className="hidden lg:flex items-stretch h-16 gap-6">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} className={`flex items-center text-[13px] font-bold uppercase tracking-wide border-b-4 ${onShop && n.match(params) ? "border-primary-container" : "border-transparent"} hover:border-primary-container ${n.accent ? "text-primary-container" : ""}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden md:block flex-1 max-w-xl ml-auto">{search}</div>
        <div className="flex items-center gap-1 ml-auto md:ml-0">
          {user ? (
            <div className="relative group">
              <IconLink to="/account" icon="person" label={user.name?.split(" ")[0] || "Profile"} />
              <div className="absolute right-0 top-full hidden group-hover:block group-focus-within:block pt-2">
                <div className="w-48 bg-white shadow-lg rounded-md border border-border py-2 text-[14px]">
                  <Link to="/account" className="block px-4 py-2 hover:bg-surface-container-low">My account</Link>
                  <Link to="/account/orders" className="block px-4 py-2 hover:bg-surface-container-low">Orders</Link>
                  <Link to="/wishlist" className="block px-4 py-2 hover:bg-surface-container-low">Wishlist</Link>
                  {user.role === "admin" && <Link to="/admin/products" className="block px-4 py-2 hover:bg-surface-container-low">Admin</Link>}
                  <button onClick={logout} className="w-full text-left px-4 py-2 hover:bg-surface-container-low border-t border-border mt-1">Logout</button>
                </div>
              </div>
            </div>
          ) : (
            <IconLink to="/login" icon="person" label="Login" />
          )}
          <IconLink to="/wishlist" icon="favorite" label="Wishlist" badge={ids.size} />
          <IconLink to="/cart" icon="shopping_bag" label="Bag" badge={count} />
        </div>
      </div>
      <div className="md:hidden px-4 pb-3">{search}</div>
      {menu && (
        <nav className="lg:hidden border-t border-border bg-white px-4 py-2">
          {NAV.map((n) => <Link key={n.label} to={n.to} onClick={() => setMenu(false)} className={`block py-3 text-[14px] font-semibold uppercase border-b border-border last:border-0 ${n.accent ? "text-primary-container" : ""}`}>{n.label}</Link>)}
        </nav>
      )}
    </header>
  );
}
