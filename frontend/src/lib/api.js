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

async function send(path, { method = "POST", body, csrf, idempotencyKey } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError("API_UNREACHABLE", "Could not reach the API. Start it with uvicorn (backend/README) and retry.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new ApiError(data.error?.code || `HTTP_${res.status}`, data.error?.message || "Request failed.");
    err.fields = data.error?.fields || {};
    err.validated = data.error?.validated;
    throw err;
  }
  return data;
}

export const api = {
  categories: () => get("/categories"),
  products: (p) => get("/products", p),
  product: (slug) => get(`/products/${encodeURIComponent(slug)}`),
  tryOnAssets: (id) => get(`/products/${encodeURIComponent(id)}/try-on-assets`),
  validateCart: (items) => send("/cart/validate", { body: { items } }),
};

// Calls needing the session cookie + CSRF token (AuthContext supplies csrf).
export const authedApi = (csrf) => ({
  post: (path, body, opts = {}) => send(path, { method: "POST", body, csrf, ...opts }),
  patch: (path, body) => send(path, { method: "PATCH", body, csrf }),
  put: (path, body) => send(path, { method: "PUT", body, csrf }),
  del: (path) => send(path, { method: "DELETE", csrf }),
  get: (path) => send(path, { method: "GET", csrf }),
});

// Resolve a mock-cart line (slug/color/size) to a server variant_id.
const detailCache = new Map();
export async function resolveVariant(slug, colorName, sizeLabel) {
  if (!detailCache.has(slug)) detailCache.set(slug, get(`/products/${encodeURIComponent(slug)}`));
  const d = await detailCache.get(slug);
  const color = d.colors.find((c) => c.name === colorName) ?? d.colors[0];
  const variant = color.variants.find((v) => v.size_label === sizeLabel) ?? color.variants[0];
  return { variant_id: variant.variant_id, title: d.title, photo: d.photos[0]?.url };
}

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
