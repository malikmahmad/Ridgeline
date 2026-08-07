import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let nextId = 1;

const ICON = {
  success:      <CheckCircle2 size={16} className="shrink-0 text-emerald" />,
  error:        <AlertCircle  size={16} className="shrink-0 text-rose" />,
  info:         <Info         size={16} className="shrink-0 text-indigo-600" />,
  notification: <Bell         size={16} className="shrink-0 text-indigo-600" />,
};

const STYLE = {
  success:      "border-emerald/30 bg-emerald-soft",
  error:        "border-rose/30 bg-rose-soft",
  info:         "border-indigo-500/30 bg-indigo-50",
  notification: "border-indigo-500/30 bg-indigo-50",
};

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration || 4500);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`toast-enter pointer-events-auto flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${STYLE[toast.type] || STYLE.info}`}
    >
      {ICON[toast.type] || ICON.info}
      <div className="min-w-0 flex-1">
        {toast.title ? <p className="text-sm font-semibold text-ink">{toast.title}</p> : null}
        <p className="text-sm leading-snug text-muted">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 text-muted hover:text-ink"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(({ type = "info", title, message, duration }) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);
    return id;
  }, []);

  const toast = {
    success:  (msg, title) => show({ type: "success",      message: msg, title }),
    error:    (msg, title) => show({ type: "error",        message: msg, title }),
    info:     (msg, title) => show({ type: "info",         message: msg, title }),
    notify:   (msg, title) => show({ type: "notification", message: msg, title }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
