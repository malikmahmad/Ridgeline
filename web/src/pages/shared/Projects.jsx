import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowUpDown, Filter, Plus, Search, X } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { ProjectStatusBadge, PriorityBadge } from "../../components/ui/Badges";
import { formatDate } from "../../lib/format";
import Modal from "../../components/ui/Modal";

const emptyForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  priority: "medium",
  status: "planning",
  managerId: "",
};

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { active: 0, planning: 1, on_hold: 2, completed: 3, cancelled: 4 };

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Create project modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.getProjects().then((res) => setProjects(res.projects)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (user?.role === "admin") {
      api.getUsers("manager").then((res) => setManagers(res.users));
    }
  }, [user]);

  // Apply search + filters + sort
  const filtered = projects
    .filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (priorityFilter && p.priority !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "priority":
          return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
        case "status":
          return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        case "progress_desc":
          return b.progress - a.progress;
        case "progress_asc":
          return a.progress - b.progress;
        case "deadline":
          if (!a.end_date && !b.end_date) return 0;
          if (!a.end_date) return 1;
          if (!b.end_date) return -1;
          return new Date(a.end_date) - new Date(b.end_date);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const hasActiveFilters = statusFilter || priorityFilter;

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createProject(form);
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setStatusFilter("");
    setPriorityFilter("");
    setSearch("");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {user?.role === "admin" ? "All Projects" : "My Projects"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? "Loading…" : `${filtered.length} of ${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {user?.role === "admin" ? (
          <button
            onClick={() => { setForm(emptyForm); setError(""); setModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900"
          >
            <Plus size={16} /> New project
          </button>
        ) : null}
      </div>

      {/* Search, filter, sort toolbar */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            <Filter size={14} />
            Filter
            {hasActiveFilters ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[0.6rem] font-bold text-white">
                {[statusFilter, priorityFilter].filter(Boolean).length}
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="shrink-0 text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="deadline">Deadline (soonest)</option>
            <option value="progress_desc">Most progress</option>
            <option value="progress_asc">Least progress</option>
          </select>
        </div>
      </div>

      {/* Expandable filter panel */}
      {showFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All statuses</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-4 flex items-center gap-1 text-sm text-muted hover:text-rose"
            >
              <X size={13} /> Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Project grid */}
      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line py-14 text-center">
          <p className="text-muted">
            {hasActiveFilters || search ? "No projects match your filters." : "No projects yet."}
          </p>
          {hasActiveFilters || search ? (
            <button onClick={clearFilters} className="mt-2 text-sm text-indigo-600 hover:underline">
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="flex flex-col rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-ink line-clamp-1">{p.name}</h3>
                <PriorityBadge priority={p.priority} />
              </div>
              <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted">
                {p.description || "No description yet."}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span>PM: {p.manager?.name || "Unassigned"}</span>
                <ProjectStatusBadge status={p.status} />
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                <span>{p.completedTaskCount}/{p.taskCount} tasks done</span>
                <span>{p.memberCount} member{p.memberCount === 1 ? "" : "s"}</span>
              </div>
              {p.end_date ? (
                <p className="mt-2 text-xs text-muted">
                  Due {formatDate(p.end_date)}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {modalOpen ? (
        <Modal title="New project" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            {error ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Project name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Assign Project Manager *</label>
              <select
                required
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Choose a manager…</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.title ? ` — ${m.title}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create project"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
