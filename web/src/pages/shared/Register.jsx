import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Loader2, Mountain } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-indigo-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-lg">
        <div className="flex items-center gap-2 text-indigo-600">
          <Mountain size={22} />
          <span className="text-base font-bold tracking-tight">Ridgeline</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          Sign up as a Team Member. Admin and Project Manager accounts are created by your administrator.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Create account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
