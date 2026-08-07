import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle2, Filter } from "lucide-react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";

const TYPE_LABELS = {
  task_assigned:       "Task assigned",
  task_status_changed: "Status update",
  new_comment:         "New comment",
  deadline_approaching:"Deadline approaching",
  added_to_project:    "Project update",
};

const TYPE_COLOR = {
  task_assigned:       "text-indigo-600",
  task_status_changed: "text-emerald",
  new_comment:         "text-indigo-600",
  deadline_approaching:"text-amber",
  added_to_project:    "text-indigo-600",
};

const FILTERS = [
  { key: "all",                  label: "All" },
  { key: "task_assigned",        label: "Assigned" },
  { key: "task_status_changed",  label: "Status" },
  { key: "new_comment",          label: "Comments" },
  { key: "deadline_approaching", label: "Deadlines" },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("all");

  function load() {
    api.getNotifications()
      .then((res) => setNotifications(res.notifications))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleMarkRead(id) {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
  }

  async function handleMarkAll() {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  }

  const displayed = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const hasUnread    = notifications.some((n) => !n.is_read);
  const unreadCount  = notifications.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-muted">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink"
          >
            <CheckCircle2 size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.key === "all"
            ? notifications.length
            : notifications.filter((n) => n.type === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-line text-muted hover:border-indigo-400 hover:text-ink"
              }`}
            >
              {f.label}
              <span className={`text-xs ${filter === f.key ? "text-white/70" : "text-muted"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line py-16 text-center">
          <Bell size={28} className="mx-auto text-muted/40" />
          <p className="mt-3 text-muted">
            {filter === "all" ? "You're all caught up." : "No notifications of this type."}
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
          {displayed.map((n) => {
            const target = n.task_id
              ? `/tasks/${n.task_id}`
              : n.project_id
              ? `/projects/${n.project_id}`
              : null;

            const content = (
              <div className={`flex items-start justify-between gap-4 p-4 transition-colors ${!n.is_read ? "bg-indigo-50/50" : ""}`}>
                <div className="mt-1.5 shrink-0">
                  {!n.is_read ? (
                    <span className="block h-2 w-2 rounded-full bg-indigo-600" />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={`font-mono text-[0.65rem] font-semibold uppercase tracking-wider ${TYPE_COLOR[n.type] || "text-indigo-600"}`}>
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  <p className="mt-1 text-sm text-ink leading-snug">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => { e.preventDefault(); handleMarkRead(n.id); }}
                    className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-indigo-600"
                    aria-label="Mark as read"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            );

            return target ? (
              <Link key={n.id} to={target} className="block hover:bg-canvas">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
