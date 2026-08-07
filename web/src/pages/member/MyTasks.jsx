import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react";
import { api } from "../../lib/api";
import { PriorityBadge, TaskStatusBadge } from "../../components/ui/Badges";
import { formatDate, isOverdue } from "../../lib/format";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    api.getMyTasks().then((res) => setTasks(res.tasks)).finally(() => setLoading(false));
  }, []);

  const processed = useMemo(() => {
    let list = tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.project_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    switch (sortBy) {
      case "priority":
        list = [...list].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
        break;
      case "deadline":
        list = [...list].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        break;
      case "project":
        list = [...list].sort((a, b) => a.project_name.localeCompare(b.project_name));
        break;
      case "title":
        list = [...list].sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        // default: incomplete first, then by due date
        list = [...list].sort((a, b) => {
          const aDone = a.status === "completed" ? 1 : 0;
          const bDone = b.status === "completed" ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
    }
    return list;
  }, [tasks, statusFilter, search, sortBy]);

  const counts = useMemo(() => {
    return STATUS_FILTERS.reduce((acc, f) => {
      acc[f.key] = f.key === "all" ? tasks.length : tasks.filter((t) => t.status === f.key).length;
      return acc;
    }, {});
  }, [tasks]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink">My Tasks</h1>
      <p className="mt-1 text-sm text-muted">Everything assigned to you, across all projects.</p>

      {/* Status filter pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              statusFilter === f.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-line text-muted hover:border-indigo-400"
            }`}
          >
            {f.label}
            <span className={`text-xs ${statusFilter === f.key ? "text-white/80" : "text-muted"}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or project…"
            className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-4 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="shrink-0 text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="default">Default order</option>
            <option value="priority">Priority</option>
            <option value="deadline">Due date (soonest)</option>
            <option value="project">Project name</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
        </div>
      ) : processed.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line py-14 text-center text-muted">
          {search || statusFilter !== "all" ? "No tasks match your search." : "No tasks assigned to you yet."}
        </div>
      ) : (
        <div className="mt-5 divide-y divide-line rounded-xl border border-line bg-surface">
          {processed.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex flex-col gap-2 p-4 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-ink">{task.title}</p>
                <p className="mt-0.5 text-xs text-muted">{task.project_name}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <TaskStatusBadge status={task.status} />
                {task.due_date ? (
                  <span className={`text-xs ${isOverdue(task.due_date, task.status) ? "font-medium text-rose" : "text-muted"}`}>
                    {isOverdue(task.due_date, task.status) ? "Overdue · " : ""}{formatDate(task.due_date)}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
