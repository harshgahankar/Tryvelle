import { Link, NavLink, useNavigate } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { useAuth } from "../store/AuthContext";

export default function Header() {
  const { cart } = useShop();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const count = cart.reduce((s, c) => s + c.qty, 0);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="h-20 max-w-7xl mx-auto px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-xl shrink-0">
          <Link to="/" className="flex items-center gap-space-xs">
            <span className="font-headline-sm uppercase tracking-tight text-on-surface">Clothing Studio</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-space-lg">
            <NavLink to="/#new-arrivals" className="font-label-md text-on-surface-variant hover:text-on-surface py-2">New arrivals</NavLink>
            <NavLink to="/shop" className="font-label-md text-on-surface-variant hover:text-on-surface py-2">Shop</NavLink>
            <NavLink to="/try-on/setup" className="font-label-md text-on-surface-variant hover:text-on-surface py-2">Try on guide</NavLink>
          </nav>
        </div>
        <div className="hidden md:flex flex-1 max-w-md mx-space-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">search</span>
            <input
              onKeyDown={(e) => e.key === "Enter" && nav(`/shop?q=${encodeURIComponent(e.target.value)}`)}
              className="w-full h-11 pl-10 pr-4 bg-surface rounded-lg border border-border font-body-sm placeholder:text-secondary focus:outline-none focus:border-on-surface"
              placeholder="Search catalog, textures, silhouettes..."
              type="search"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/wishlist" aria-label="Wishlist" className="p-2 text-on-surface flex items-center"><span className="material-symbols-outlined text-[24px]">favorite</span></Link>
          <Link to="/cart" aria-label="Shopping Bag" className="p-2 text-on-surface flex items-center relative">
            <span className="material-symbols-outlined text-[24px]">shopping_bag</span>
            {count > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-container text-on-primary font-caption font-semibold flex items-center justify-center text-[10px]">{count}</span>
            )}
          </Link>
          <div className="h-5 w-[1px] bg-border mx-1 hidden sm:block" />
          {user ? (
            <>
              {user.role === "admin" && <Link to="/admin/products" className="hidden sm:inline-flex h-10 px-3 items-center font-label-md underline">Admin</Link>}
              <Link to="/account/orders" className="hidden sm:inline font-caption underline">Orders</Link>
              <span className="hidden sm:inline font-caption text-secondary max-w-24 truncate">{user.name}</span>
              <button onClick={logout} className="h-10 px-3 rounded-lg border font-label-md text-[14px]">Logout</button>
            </>
          ) : (
            <Link to="/login" className="hidden sm:inline-flex h-10 px-4 items-center rounded-lg bg-on-surface text-surface font-label-md text-[14px] font-semibold">Login</Link>
          )}
          <Link to="/checkout" className="hidden sm:inline-flex h-10 px-4 items-center rounded-lg bg-on-surface text-surface font-label-md text-[14px] font-semibold">Checkout</Link>
        </div>
      </div>
    </header>
  );
}
