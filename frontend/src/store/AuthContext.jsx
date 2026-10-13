import { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

async function request(path, { method = "GET", body, csrf } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Could not reach the API. Start it (backend/README) and retry.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || "Request failed.");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrf, setCsrf] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const d = await request("/auth/me");
      setUser(d.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const d = await request("/auth/login", { method: "POST", body: { email, password } });
    setUser(d.user);
    setCsrf(d.csrf_token);
    return d.user;
  };
  const register = async (name, email, password) => {
    const d = await request("/auth/register", { method: "POST", body: { name, email, password } });
    setUser(d.user);
    setCsrf(d.csrf_token);
    return d.user;
  };
  const logout = async () => {
    await request("/auth/logout", { method: "POST", csrf }).catch(() => {});
    setUser(null);
    setCsrf(null);
  };
  const authed = (path, opts = {}) => request(path, { ...opts, csrf });

  return (
    <AuthContext.Provider value={{ user, csrf, ready, login, register, logout, refresh, authed }}>
      {children}
    </AuthContext.Provider>
  );
}
