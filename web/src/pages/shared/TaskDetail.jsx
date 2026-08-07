import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Download, FileText,
  Paperclip, Pencil, Send, Trash2, Upload,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { PriorityBadge, TaskStatusBadge } from "../../components/ui/Badges";
import { formatDate, timeAgo } from "../../lib/format";
import Modal from "../../components/ui/Modal";

const STATUS_OPTIONS = [
  { value: "todo",        label: "To Do"       },
  { value: "in_progress", label: "In Progress" },
  { value: "review",      label: "Review"      },
  { value: "completed",   label: "Completed"   },
];

const ROLE_COLOR = {
  admin:   "text-rose",
  manager: "text-indigo-600",
  member:  "text-emerald",
};

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime) {
  if (mime?.startsWith("image/")) return "🖼️";
  if (mime?.includes("pdf"))      return "📄";
  if (mime?.includes("zip") || mime?.includes("compressed")) return "🗜️";
  if (mime?.includes("spreadsheet") || mime?.includes("excel")) return "📊";
  if (mime?.includes("word") || mime?.includes("document"))     return "📝";
  return "📎";
}

function Attachments({ taskId, attachments, onRefresh }) {
  const { user } = useAuth();
  const toast    = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10 MB.");
      return;
    }
    setUploading(true);
    try {
      await api.uploadAttachment(taskId, file);
      toast.success(`"${file.name}" uploaded.`);
      onRefresh();
    } catch (err) {
      toast.error(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(att) {
    if (!window.confirm(`Delete "${att.filename}"?`)) return;
    try {
      await api.deleteAttachment(taskId, att.id);
      toast.success("Attachment deleted.");
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const canDelete = (att) =>
    user?.role === "admin" || user?.role === "manager" || att.user_id === user?.id;

  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={15} className="text-muted" />
          <h2 className="font-semibold text-ink">Attachments</h2>
          {attachments.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
        >
          <Upload size={12} />
          {uploading ? "Uploading…" : "Attach file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />
      </div>

      {attachments.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-line py-8 text-muted hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          <Paperclip size={24} className="mb-2 opacity-40" />
          <p className="text-sm font-medium">Drop a file or click to attach</p>
          <p className="mt-1 text-xs opacity-60">Up to 10 MB per file</p>
        </button>
      ) : (
        <div className="mt-3 divide-y divide-line">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-3 py-3">
              <span className="text-xl leading-none">{fileIcon(att.mime_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{att.filename}</p>
                <p className="text-xs text-muted">
                  {formatBytes(att.size_bytes)} · {att.uploader_name} · {timeAgo(att.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/api/attachments/${taskId}/download/${att.id}`}
                  download={att.filename}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-indigo-600"
                  title="Download"
                >
                  <Download size={14} />
                </a>
                {canDelete(att) && (
                  <button
                    onClick={() => handleDelete(att)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-rose-soft hover:text-rose"
                    title="Delete attachment"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast    = useToast();

  const [task,        setTask]        = useState(null);
  const [comments,    setComments]    = useState([]);
  const [members,     setMembers]     = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState("");
  const [posting,     setPosting]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [editOpen,    setEditOpen]    = useState(false);
  const [editForm,    setEditForm]    = useState({});
  const [editError,   setEditError]   = useState("");
  const [savingEdit,  setSavingEdit]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.getTask(id),
      api.getComments(id),
      api.getAttachments(id),
    ])
      .then(([t, c, a]) => {
        setTask(t.task);
        setComments(c.comments);
        setAttachments(a.attachments || []);
        return api.getProjectMembers(t.task.project_id);
      })
      .then((m) => setMembers(m.members))
      .finally(() => setLoading(false));
  }

  function refreshAttachments() {
    api.getAttachments(id).then((a) => setAttachments(a.attachments || []));
  }

  useEffect(loadAll, [id]);

  const canManage = user?.role === "admin" || user?.role === "manager";
  const canChangeStatus =
    canManage || (user?.role === "member" && task?.assignee?.id === user?.id);

  async function handleStatusChange(status) {
    setUpdatingStatus(true);
    try {
      const res = await api.updateTaskStatus(id, status);
      setTask(res.task);
      toast.success(`Task moved to "${STATUS_OPTIONS.find((s) => s.value === status)?.label}".`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setPosting(true);
    try {
      await api.addComment(id, message.trim());
      setMessage("");
      const { comments } = await api.getComments(id);
      setComments(comments);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  }

  function openEdit() {
    setEditForm({
      title:      task.title,
      description: task.description || "",
      assigneeId:  task.assignee?.id ? String(task.assignee.id) : "",
      priority:    task.priority,
      dueDate:     task.due_date || "",
    });
    setEditError("");
    setEditOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      await api.updateTask(id, { ...editForm, assigneeId: editForm.assigneeId || null });
      setEditOpen(false);
      loadAll();
      toast.success("Task updated.");
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    try {
      await api.deleteTask(id);
      navigate(`/projects/${task.project_id}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-surface" />
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <div className="h-36 animate-pulse rounded-xl bg-surface" />
            <div className="h-64 animate-pulse rounded-xl bg-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-surface" />
        </div>
      </div>
    );
  }
  if (!task) return <p className="text-rose">Task not found.</p>;

  return (
    <div>
      <Link
        to={`/projects/${task.project_id}`}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-indigo-600"
      >
        <ArrowLeft size={15} /> Back to project
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{task.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canChangeStatus && (
            <select
              value={task.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}
          {canManage && (
            <>
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-ink hover:bg-canvas"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-rose hover:bg-rose-soft"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">

        <div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted whitespace-pre-wrap">
              {task.description || "No description added yet."}
            </p>
          </div>

          <Attachments
            taskId={id}
            attachments={attachments}
            onRefresh={refreshAttachments}
          />

          <div className="mt-5 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold text-ink">Discussion</h2>
            <p className="mt-0.5 text-xs text-muted">Keep it scoped to this task.</p>

            <div className="mt-4 space-y-5">
              {comments.length === 0 ? (
                <p className="text-sm text-muted">No comments yet — start the conversation.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {c.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-sm font-semibold text-ink">{c.author_name}</span>
                        <span className={`text-xs capitalize ${ROLE_COLOR[c.author_role] || "text-muted"}`}>
                          {c.author_role}
                        </span>
                        <span className="text-xs text-muted">· {timeAgo(c.created_at)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/85">{c.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handlePostComment} className="mt-5 flex gap-2 border-t border-line pt-4">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add to the discussion…"
                className="flex-1 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={posting || !message.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60"
              >
                <Send size={14} /> Post
              </button>
            </form>
          </div>
        </div>

        <div className="h-fit rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Details</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Assignee</dt>
              <dd className="mt-1">
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                      {task.assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-ink">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-muted">Unassigned</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Due date</dt>
              <dd className="mt-1 text-ink">{formatDate(task.due_date)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Priority</dt>
              <dd className="mt-1"><PriorityBadge priority={task.priority} /></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt>
              <dd className="mt-1"><TaskStatusBadge status={task.status} /></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Attachments</dt>
              <dd className="mt-1 text-ink">{attachments.length} file{attachments.length !== 1 ? "s" : ""}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Comments</dt>
              <dd className="mt-1 text-ink">{comments.length}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Created</dt>
              <dd className="mt-1 text-xs text-muted">{formatDate(task.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Last updated</dt>
              <dd className="mt-1 text-xs text-muted">{timeAgo(task.updated_at)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Edit task modal ── */}
      {editOpen && (
        <Modal title="Edit task" onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            {editError && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-soft px-3.5 py-2.5 text-sm text-rose">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {editError}
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Title *</label>
              <input required value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <textarea rows={3} value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Assign to</label>
              <select value={editForm.assigneeId}
                onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-500">
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Priority</label>
                <select value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
                <input type="date" value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <button type="submit" disabled={savingEdit}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-900 disabled:opacity-60">
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmDelete && (
        <Modal title="Delete task?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-muted">
            Permanently delete{" "}
            <span className="font-semibold text-ink">"{task.title}"</span>?
            All comments and attachments will also be removed. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-canvas">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="rounded-lg bg-rose px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Delete task
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
