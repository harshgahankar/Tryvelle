import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ShopProvider } from "./store/ShopContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import TryOnSetup from "./pages/TryOnSetup";
import LiveTryOn from "./pages/LiveTryOn";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import PrototypeTryOn from "./pages/PrototypeTryOn";

function StorefrontLayout() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col antialiased">
      <Header />
      <main className="w-full pt-20 flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function CameraLayout() {
  return (
    <div className="bg-camera-surface min-h-screen flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <span className="font-headline-sm uppercase text-white">Clothing Studio · Try-On</span>
      </div>
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/try-on/setup" element={<TryOnSetup />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/prototype/try-on" element={<PrototypeTryOn />} />
          </Route>
          <Route element={<CameraLayout />}>
            <Route path="/try-on/live" element={<LiveTryOn />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ShopProvider>
  );
}
