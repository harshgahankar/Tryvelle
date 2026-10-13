// API client for the Tryvelle backend. Base defaults to local dev so the
// shop works with no .env file; override with VITE_API_BASE_URL.
const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function get(path, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== null && v !== undefined) qs.set(k, v);
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}?${qs}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError("API_UNREACHABLE", "Could not reach the API. Start it with uvicorn (backend/README) and retry.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body.error || {};
    throw new ApiError(err.code || `HTTP_${res.status}`, err.message || "Request failed.");
  }
  return body;
}

export const api = {
  categories: () => get("/categories"),
  products: (p) => get("/products", p),
  product: (slug) => get(`/products/${encodeURIComponent(slug)}`),
  tryOnAssets: (id) => get(`/products/${encodeURIComponent(id)}/try-on-assets`),
};

export const minorToInr = (minor) => `₹${(minor / 100).toLocaleString("en-IN")}`;

// Adapt API list items to the ProductCard shape.
export function toCard(item) {
  return {
    slug: item.slug,
    name: item.title,
    price: item.min_price_minor / 100,
    fabric: item.category.name,
    tryOn: item.try_on_available,
    badge: item.try_on_available ? "Try-on available" : item.category.name,
    colors: item.colors.map((c) => ({ name: c.name, hex: c.hex })),
    img: item.photos[0]?.url,
  };
}
