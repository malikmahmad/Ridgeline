import { Link } from "react-router-dom";
import { Mountain, MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <Mountain size={40} className="text-indigo-600" />
      <h1 className="mt-6 text-6xl font-bold text-ink">404</h1>
      <p className="mt-3 text-xl font-medium text-ink">Page not found</p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        That page doesn't exist, or you don't have permission to view it.
      </p>
      <Link
        to="/"
        className="mt-8 flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-900"
      >
        <MoveLeft size={16} /> Back to dashboard
      </Link>
    </div>
  );
}
