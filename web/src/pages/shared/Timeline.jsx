import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity, CheckCircle2, FolderKanban, MessageSquare,
  Paperclip, RefreshCw, Trash2, UserPlus, UserMinus, Plus,
} from "lucide-react";
import { api } from "../../lib/api";
import { timeAgo, formatDateTime } from "../../lib/format";

/* ── action meta ─────────────────────────────────────────────── */
const ACTION_META = {
  project_created:     { icon: FolderKanban,  color: "bg-indigo-50 text-indigo-600",  label: "Created project"       },
  project_updated:     { icon: RefreshCw,     color: "bg-slate-soft text-muted",      label: "Updated project"       },
  task_created:        { icon: Plus,          color: "bg-emerald-soft text-emerald",  label: "Created task"          },
  task_updated:        { icon: RefreshCw,     color: "bg-slate-soft text-muted",      label: "Updated task"          },
  task_status_changed: { icon: CheckCircle2,  color: "bg-amber-soft text-amber",      label: "Changed task status"   },
  task_deleted:        { icon: Trash2,        color: "bg-rose-soft text-rose",        label: "Deleted task"          },
  comment_added:       { icon: MessageSquare, color: "bg-indigo-50 text-indigo-600",  label: "Added comment"         },
  member_added:        { icon: UserPlus,      color: "bg-emerald-soft text-emerald",  label: "Added team member"     },
  member_removed:      { icon: UserMinus,     color: "bg-rose-soft text-rose",        label: "Removed team member"   },
  file_attached:       { icon: Paperclip,     color: "bg-amber-soft text-amber",      label: "Attached file"         },
  user_created:        { icon: UserPlus,      color: "bg-indigo-50 text-indigo-600",  label: "Created user"          },
};

const DEFAULT_META = { icon: Activity, color: "bg-slate-soft text-muted", label: "Activity" };

function getLink(event) {
  if (event.task_id)    return `/tasks/${event.task_id}`;
  if (event.project_id) return `/projects/${event.project_id}`;
  return null;
}

function groupByDate(events) {
  const groups = [];
  let current = null;
  for (const ev of events) {
    const day = ev.created_at?.slice(0, 10) ?? "unknown";
    if (!current || current.day !== day) {
      current = { day, items: [] };
      groups.push(current);
    }
    current.items.push(ev);
  }
  return groups;
}

function DayLabel({ day }) {
  if (!day || day === "unknown") return <span>Unknown date</span>;
  try {
    const d = new Date(day + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === today.getTime()) return <span>Today</span>;
    if (d.getTime() === yesterday.getTime()) return <span>Yesterday</span>;
    return <span>{d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</span>;
  } catch { return <span>{day}</span>; }
}

const ROLE_BADGE = {
  admin:   "bg-rose-soft text-rose",
  manager: "bg-indigo-50 text-indigo-600",
  member:  "bg-emerald-soft text-emerald",
};

export default function Timeline() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter]   = useState("");   // action filter
  const offset = useRef(0);
  const LIMIT  = 60;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const off = reset ? 0 : offset.current;
      const { events: rows } = await api.getActivity({ limit: LIMIT, offset: off });
      setHasMore(rows.length === LIMIT);
      offset.current = off + rows.length;
      setEvents((prev) => reset ? rows : [...prev, ...rows]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(true); }, [load]);

  const displayed = filter
    ? events.filter((e) => e.action === filter)
    : events;

  const grouped = groupByDate(displayed);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Activity Timeline</h1>
          <p className="mt-1 text-sm text-muted">Everything that happens across the workspace, in order.</p>
        </div>
        <button
          onClick={() => { offset.current = 0; load(true); }}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["", "All"],
          ["task_created", "Task created"],
          ["task_status_changed", "Status changed"],
          ["comment_added", "Comments"],
          ["project_created", "Projects"],
          ["member_added", "Members"],
          ["file_attached", "Files"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              filter === val
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-line text-muted hover:border-indigo-400 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {loading && events.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-9 w-9 animate-pulse rounded-full bg-surface-2 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-48 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-16 text-center">
            <Activity size={28} className="mx-auto text-muted/40" />
            <p className="mt-3 text-muted">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map((group) => (
              <div key={group.day}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-line" />
                  <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
                    <DayLabel day={group.day} />
                  </span>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <div className="relative space-y-0">
                  <div className="absolute left-[17px] top-0 bottom-0 w-px bg-line" aria-hidden />

                  {group.items.map((ev) => {
                    const meta = ACTION_META[ev.action] || DEFAULT_META;
                    const Icon = meta.icon;
                    const link = getLink(ev);

                    return (
                      <div key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
                        <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                          <Icon size={15} />
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            {ev.actor_name ? (
                              <span className="text-sm font-semibold text-ink">{ev.actor_name}</span>
                            ) : (
                              <span className="text-sm font-semibold text-muted">System</span>
                            )}
                            {ev.actor_role ? (
                              <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium capitalize ${ROLE_BADGE[ev.actor_role] || "bg-slate-soft text-muted"}`}>
                                {ev.actor_role}
                              </span>
                            ) : null}
                            <span className="text-sm text-muted">{meta.label.toLowerCase()}</span>
                          </div>

                          <p className="mt-0.5 text-sm text-ink/80">{ev.detail}</p>

                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-xs text-muted">{timeAgo(ev.created_at)}</span>
                            {link ? (
                              <Link to={link} className="text-xs text-indigo-600 hover:underline">
                                View →
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && displayed.length > 0 ? (
          <button
            onClick={() => load(false)}
            className="mt-8 w-full rounded-lg border border-line bg-surface py-3 text-sm text-muted hover:bg-canvas hover:text-ink"
          >
            Load older activity
          </button>
        ) : null}
        {loading && events.length > 0 ? (
          <p className="mt-6 text-center text-sm text-muted">Loading…</p>
        ) : null}
      </div>
    </div>
  );
}
