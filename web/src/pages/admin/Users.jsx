import { useEffect, useState } from "react";
import { AlertCircle, ArrowUpDown, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/ui/Modal";

const emptyCreateForm = { name: "", email: "", password: "", role: "member", title: "" };
const ROLE_LABELS = { admin: "Administrator", manager: "Project Manager", member: "Team Member" };
const ROLE_BADGE = {
  admin: "bg-rose-soft text-rose",
  manager: "bg-indigo-50 text-indigo-600",
  member: "bg-slate-soft text-muted",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "member", title: "", isActive: true });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  function load() {
    setLoading(true);
    api.getUsers().then((res) => setUsers(res.users)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase();
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "role": return a.role.localeCompare(b.role);
        case "newest": return new Date(b.createdAt) - new Date(a.createdAt);
        default: return 0;
      }
    });

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setCreateError("");
    setCreateOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await api.createUser(createForm);
      setCreateOpen(false);
      load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u) {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, title: u.title, isActive: u.isActive });
    setEditError("");
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      await api.updateUser(editingUser.id, editForm);
      setEditingUser(null);
      load();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    load();
  }

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    manager: users.filter((u) => u.role === "manager").length,
    member: users.filter((u) => u.role === "member").length,
    active: users.filter((u) => u.isActive).length,
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {counts.total} total · {counts.admin} admin · {counts.manager} manager · {counts.member} member
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-line bg-surface py-2.5 pl-9 pr-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All roles</option>
            <option value="admin">Administrator</option>
            <option value="manager">Project Manager</option>
            <option value="member">Team Member</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="shrink-0 text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="name">Name A–Z</option>
            <option value="role">Role</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
        <table>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">No users found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink">{u.name}</p>
                        <p className="text-xs text-muted">{u.title || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[u.role] || "bg-slate-soft text-muted"}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-soft px-2.5 py-1 text-xs font-medium text-emerald">
                        <UserCheck size={11} /> Active
                      </span>
                    ) : (
                      <span className="flex w-fit items-center gap-1 rounded-full bg-slate-soft px-2.5 py-1 text-xs font-medium text-muted">
                        <UserX size={11} /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="text-muted hover:text-indigo-600" aria-label="Edit">
                        <Pencil size={16} />
                      </button>
                      {u.id !== currentUser.id ? (
                        <button onClick={() => setDeleteTarget(u)} className="text-muted hover:text-rose" aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen ? (
        <Modal title="Add user" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            {createError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {createError}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs text-muted">Full name</label>
              <input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Email</label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Temporary password</label>
              <input
                type="text"
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="member">Team Member</option>
                  <option value="manager">Project Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Job title</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create user"}
            </button>
          </form>
        </Modal>
      ) : null}

      {editingUser ? (
        <Modal title={`Edit ${editingUser.name}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            {editError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {editError}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs text-muted">Full name</label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={editingUser.id === currentUser.id}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-surface-2"
                >
                  <option value="member">Team Member</option>
                  <option value="manager">Project Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Job title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-line accent-indigo-600"
              />
              Account active
            </label>
            <button
              type="submit"
              disabled={savingEdit}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
            >
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete user?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-muted">
            This will permanently delete <span className="font-medium text-ink">{deleteTarget.name}</span>'s account. Any tasks assigned to them will become unassigned.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-canvas">
              Cancel
            </button>
            <button onClick={handleDelete} className="rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Delete
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
