import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Filter, MessageSquare, Pencil,
  Plus, Search, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { PriorityBadge, ProjectStatusBadge, TaskStatusBadge } from "../../components/ui/Badges";
import { formatDate, isOverdue } from "../../lib/format";
import Modal from "../../components/ui/Modal";

const TABS = ["Overview", "Tasks", "Team"];
const TASK_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

const emptyTaskForm    = { title: "", description: "", assigneeId: "", priority: "medium", dueDate: "" };
const emptyProjectForm = { name: "", description: "", startDate: "", endDate: "", priority: "medium", status: "planning" };

function TaskFormFields({ form, setForm, members }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Title *</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
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
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Assign to</label>
        <select
          value={form.assigneeId}
          onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
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
          <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");

  // Task search / filter
  const [taskSearch, setTaskSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");

  // Create task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [taskError, setTaskError] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Edit task modal
  const [editingTask, setEditingTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState(emptyTaskForm);
  const [editTaskError, setEditTaskError] = useState("");
  const [savingEditTask, setSavingEditTask] = useState(false);

  // Delete task
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null);

  // Edit project modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyProjectForm);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Add/remove team members
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [pickedMemberId, setPickedMemberId] = useState("");
  const [memberError, setMemberError] = useState("");

  function loadAll() {
    setLoading(true);
    Promise.all([api.getProject(id), api.getProjectTasks(id), api.getProjectMembers(id)])
      .then(([p, t, m]) => {
        setProject(p.project);
        setTasks(t.tasks);
        setMembers(m.members);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [id]);

  const canManage =
    user?.role === "admin" || (user?.role === "manager" && project?.manager?.id === user.id);

  // Filtered tasks applied per column
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskSearch && !t.title.toLowerCase().includes(taskSearch.toLowerCase())) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && String(t.assignee?.id) !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, taskSearch, priorityFilter, assigneeFilter]);

  function openEdit() {
    setEditForm({
      name: project.name,
      description: project.description,
      startDate: project.start_date || "",
      endDate: project.end_date || "",
      priority: project.priority,
      status: project.status,
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      await api.updateProject(id, editForm);
      setEditOpen(false);
      loadAll();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  function openTaskModal() {
    setTaskForm(emptyTaskForm);
    setTaskError("");
    setTaskModalOpen(true);
  }

  async function handleTaskSubmit(e) {
    e.preventDefault();
    setSavingTask(true);
    setTaskError("");
    try {
      await api.createTask(id, { ...taskForm, assigneeId: taskForm.assigneeId || null });
      setTaskModalOpen(false);
      loadAll();
    } catch (err) {
      setTaskError(err.message);
    } finally {
      setSavingTask(false);
    }
  }

  function openEditTask(task) {
    setEditingTask(task);
    setEditTaskForm({
      title: task.title,
      description: task.description || "",
      assigneeId: task.assignee?.id ? String(task.assignee.id) : "",
      priority: task.priority,
      dueDate: task.due_date || "",
    });
    setEditTaskError("");
  }

  async function handleEditTaskSubmit(e) {
    e.preventDefault();
    setSavingEditTask(true);
    setEditTaskError("");
    try {
      await api.updateTask(editingTask.id, {
        ...editTaskForm,
        assigneeId: editTaskForm.assigneeId || null,
      });
      setEditingTask(null);
      loadAll();
    } catch (err) {
      setEditTaskError(err.message);
    } finally {
      setSavingEditTask(false);
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskTarget) return;
    await api.deleteTask(deleteTaskTarget.id);
    setDeleteTaskTarget(null);
    loadAll();
  }

  async function openAddMember() {
    setMemberError("");
    setPickedMemberId("");
    const { users } = await api.getUsers("member");
    const existingIds = new Set(members.map((m) => m.id));
    setAvailableMembers(users.filter((u) => !existingIds.has(u.id)));
    setAddMemberOpen(true);
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberError("");
    try {
      await api.addProjectMember(id, pickedMemberId);
      setAddMemberOpen(false);
      loadAll();
    } catch (err) {
      setMemberError(err.message);
    }
  }

  async function handleRemoveMember(userId) {
    if (!window.confirm("Remove this team member from the project?")) return;
    await api.removeProjectMember(id, userId);
    loadAll();
  }

  async function handleStatusChange(taskId, status) {
    await api.updateTaskStatus(taskId, status);
    loadAll();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }
  if (!project) return <p className="text-rose">Project not found.</p>;

  const hasTaskFilters = taskSearch || priorityFilter || assigneeFilter;

  return (
    <div>
      <Link to="/projects" className="flex items-center gap-1.5 text-sm text-muted hover:text-indigo-600">
        <ArrowLeft size={15} /> Back to projects
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-ink">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            <PriorityBadge priority={project.priority} />
          </div>
          <p className="mt-1 text-sm text-muted">PM: {project.manager?.name || "Unassigned"}</p>
        </div>
        {canManage ? (
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm text-ink hover:bg-canvas"
          >
            <Pencil size={14} /> Edit project
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
            {t === "Tasks" ? (
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                {tasks.length}
              </span>
            ) : null}
            {t === "Team" ? (
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                {members.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5 sm:col-span-2">
            <h2 className="font-semibold text-ink">Description</h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {project.description || "No description added yet."}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Timeline</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Start date</dt>
                <dd className="font-medium text-ink">{formatDate(project.start_date)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">End date</dt>
                <dd className="font-medium text-ink">{formatDate(project.end_date)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Progress</h2>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">{project.completedTaskCount} of {project.taskCount} tasks done</span>
              <span className="font-semibold text-indigo-600">{project.progress}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-muted" />
              <h2 className="font-semibold text-ink">Team ({members.length})</h2>
            </div>
            {members.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No team members added yet.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-surface-2 py-1.5 pl-1.5 pr-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-ink">{m.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 sm:col-span-2">
            <h2 className="font-semibold text-ink">Task breakdown</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TASK_COLUMNS.map((col) => {
                const count = tasks.filter((t) => t.status === col.key).length;
                return (
                  <div key={col.key} className="rounded-lg bg-surface-2 p-3 text-center">
                    <p className="text-2xl font-semibold text-ink">{count}</p>
                    <p className="mt-0.5 text-xs text-muted">{col.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "Tasks" ? (
        <div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 w-44"
                />
              </div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">All assignees</option>
                {members.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.name}</option>
                ))}
              </select>
              {hasTaskFilters ? (
                <button
                  onClick={() => { setTaskSearch(""); setPriorityFilter(""); setAssigneeFilter(""); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-rose"
                >
                  <X size={12} /> Clear
                </button>
              ) : null}
            </div>
            {canManage ? (
              <button
                onClick={openTaskModal}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-900"
              >
                <Plus size={15} /> New task
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            {TASK_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="rounded-xl border border-line bg-surface-2 p-3">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <h3 className="text-sm font-semibold text-ink">{col.label}</h3>
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface text-xs text-muted">
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map((task) => {
                      const canMoveTask =
                        canManage || (user.role === "member" && task.assignee?.id === user.id);
                      return (
                        <div key={task.id} className="group rounded-lg border border-line bg-surface p-3">
                          <div className="flex items-start justify-between gap-1">
                            <button
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              className="flex-1 text-left text-sm font-medium text-ink hover:text-indigo-600"
                            >
                              {task.title}
                            </button>
                            {canManage ? (
                              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => openEditTask(task)}
                                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-indigo-600"
                                  aria-label="Edit task"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  onClick={() => setDeleteTaskTarget(task)}
                                  className="rounded p-1 text-muted hover:bg-surface-2 hover:text-rose"
                                  aria-label="Delete task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <PriorityBadge priority={task.priority} />
                            {task.due_date ? (
                              <span className={`text-xs ${isOverdue(task.due_date, task.status) ? "font-medium text-rose" : "text-muted"}`}>
                                {formatDate(task.due_date)}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <p className="text-xs text-muted">{task.assignee?.name || "Unassigned"}</p>
                            {task.commentCount > 0 ? (
                              <span className="flex items-center gap-0.5 text-xs text-muted">
                                <MessageSquare size={11} /> {task.commentCount}
                              </span>
                            ) : null}
                          </div>
                          {canMoveTask ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="mt-2 w-full rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                            >
                              {TASK_COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      );
                    })}
                    {colTasks.length === 0 ? (
                      <p className="px-1 py-3 text-xs text-muted">
                        {hasTaskFilters ? "No matches." : "Nothing here."}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "Team" ? (
        <div className="mt-4">
          {canManage ? (
            <div className="flex justify-end">
              <button
                onClick={openAddMember}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-900"
              >
                <UserPlus size={15} /> Add team member
              </button>
            </div>
          ) : null}

          <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
            {members.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">No team members on this project yet.</p>
            ) : (
              members.map((m) => {
                const assigned = tasks.filter((t) => t.assignee?.id === m.id);
                const done = assigned.filter((t) => t.status === "completed").length;
                return (
                  <div key={m.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-ink">{m.name}</p>
                        <p className="text-xs text-muted">{m.title || m.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden text-right sm:block">
                        <p className="text-sm text-ink">{done}/{assigned.length}</p>
                        <p className="text-xs text-muted">tasks done</p>
                      </div>
                      {canManage ? (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-muted hover:text-rose"
                          aria-label={`Remove ${m.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {taskModalOpen ? (
        <Modal title="New task" onClose={() => setTaskModalOpen(false)}>
          <form onSubmit={handleTaskSubmit} className="space-y-3">
            {taskError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {taskError}
              </div>
            ) : null}
            <TaskFormFields form={taskForm} setForm={setTaskForm} members={members} />
            <button
              type="submit"
              disabled={savingTask}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
            >
              {savingTask ? "Creating…" : "Create task"}
            </button>
          </form>
        </Modal>
      ) : null}

      {editingTask ? (
        <Modal title={`Edit task`} onClose={() => setEditingTask(null)}>
          <form onSubmit={handleEditTaskSubmit} className="space-y-3">
            {editTaskError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {editTaskError}
              </div>
            ) : null}
            <TaskFormFields form={editTaskForm} setForm={setEditTaskForm} members={members} />
            <button
              type="submit"
              disabled={savingEditTask}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
            >
              {savingEditTask ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      ) : null}

      {deleteTaskTarget ? (
        <Modal title="Delete task?" onClose={() => setDeleteTaskTarget(null)}>
          <p className="text-sm text-muted">
            Permanently delete <span className="font-medium text-ink">"{deleteTaskTarget.title}"</span>? This will also remove all discussion comments on it.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setDeleteTaskTarget(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-canvas">
              Cancel
            </button>
            <button onClick={handleDeleteTask} className="rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Delete task
            </button>
          </div>
        </Modal>
      ) : null}

      {editOpen ? (
        <Modal title="Edit project" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            {editError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {editError}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Name *</label>
              <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Start date</label>
                <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">End date</label>
                <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={savingEdit}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60">
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      ) : null}

      {addMemberOpen ? (
        <Modal title="Add team member" onClose={() => setAddMemberOpen(false)}>
          <form onSubmit={handleAddMember} className="space-y-3">
            {memberError ? (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {memberError}
              </div>
            ) : null}
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted">All available team members are already on this project.</p>
            ) : (
              <select required value={pickedMemberId} onChange={(e) => setPickedMemberId(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo-500">
                <option value="">Choose a team member…</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.title ? ` — ${m.title}` : ""}</option>
                ))}
              </select>
            )}
            <button type="submit" disabled={availableMembers.length === 0}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60">
              Add to project
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
