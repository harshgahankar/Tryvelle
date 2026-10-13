import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="font-label-sm font-semibold">{label}</span>
      <input {...props} className="mt-1 w-full h-12 px-4 rounded-lg border border-border bg-surface font-body-sm focus:outline-none focus:border-on-surface" />
    </label>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const u = await login(email, password);
      nav(u.role === "admin" ? "/admin/products" : "/shop");
    } catch (err) { setError(err.message); }
  };
  return (
    <div className="max-w-md mx-auto px-4 py-space-2xl w-full">
      <h1 className="font-headline-lg">Login</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="font-body-sm text-danger" role="alert">{error}</p>}
        <button className="w-full h-12 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Login</button>
      </form>
      <p className="mt-3 font-body-sm text-secondary"><Link to="/register" className="underline">Create account</Link> · <Link to="/forgot-password" className="underline">Forgot password?</Link></p>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try { await register(name, email, password); nav("/shop"); }
    catch (err) { setError(err.message); }
  };
  return (
    <div className="max-w-md mx-auto px-4 py-space-2xl w-full">
      <h1 className="font-headline-lg">Create account</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password (min 10 characters)" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="font-body-sm text-danger" role="alert">{error}</p>}
        <button className="w-full h-12 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Register</button>
      </form>
      <p className="mt-3 font-body-sm text-secondary"><Link to="/login" className="underline">Already have an account?</Link></p>
    </div>
  );
}

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setDone(true);
  };
  return (
    <div className="max-w-md mx-auto px-4 py-space-2xl w-full">
      <h1 className="font-headline-lg">Reset password</h1>
      {done ? <p className="mt-4 font-body-md">If the account exists, reset instructions were sent.</p> : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="w-full h-12 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Send reset link</button>
        </form>
      )}
    </div>
  );
}

export function ResetPassword() {
  const nav = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, new_password: password }) });
    if (res.ok) setDone(true);
    else setError((await res.json().catch(() => ({}))).error?.message || "Reset failed.");
  };
  return (
    <div className="max-w-md mx-auto px-4 py-space-2xl w-full">
      <h1 className="font-headline-lg">New password</h1>
      {done ? (<><p className="mt-4 font-body-md">Password updated. All sessions were revoked.</p><button onClick={() => nav("/login")} className="mt-3 h-11 px-5 rounded-lg bg-on-surface text-surface font-label-md">Login</button></>) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="New password (min 10 characters)" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="font-body-sm text-danger" role="alert">{error}</p>}
          <button className="w-full h-12 rounded-lg bg-on-surface text-surface font-label-md font-semibold">Update password</button>
        </form>
      )}
    </div>
  );
}
