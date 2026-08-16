import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CloudUpload, FileText, MessageSquareText, PencilLine, Sparkles } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const initialSubmissions = [
  {
    id: 1,
    title: "Project Management & Team Collaboration Platform",
    submittedOn: "8/8/2026",
    status: "revision",
    points: 0,
    feedback:
      "mention your credentials immediately. otherwise your task will be rejected.",
  },
  {
    id: 2,
    title: "Full Stack E-Commerce Web Application",
    submittedOn: "7/30/2026",
    status: "approved",
    points: 65,
    feedback: "Good work. Strong UI and backend integration.",
  },
  {
    id: 3,
    title: "Personal Portfolio Website",
    submittedOn: "7/19/2026",
    status: "approved",
    points: 72,
    feedback: "Excellent portfolio and project presentation.",
  },
];

function StatusPill({ status }) {
  const styles = {
    approved: "bg-emerald-soft text-emerald border border-emerald/15",
    revision: "bg-amber-soft text-amber border border-amber/20",
    pending: "bg-indigo-50 text-indigo-600 border border-indigo-200",
  };

  const label = {
    approved: "approved",
    revision: "revision",
    pending: "pending",
  };

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || styles.pending}`}>{label[status] || status}</span>;
}

export default function Submissions() {
  const toast = useToast();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selectedId, setSelectedId] = useState(1);
  const [form, setForm] = useState({
    task: "Project Management & Team Collaboration Platform",
    links: "",
    notes: "",
  });

  const selectedSubmission = useMemo(
    () => submissions.find((item) => item.id === selectedId) ?? submissions[0],
    [selectedId, submissions]
  );

  useEffect(() => {
    if (!selectedSubmission) return;
    setForm((prev) => ({
      ...prev,
      task: selectedSubmission.title,
    }));
  }, [selectedSubmission]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? {
              ...item,
              status: "pending",
              points: 0,
              feedback: "Your work has been re-submitted and is awaiting review.",
            }
          : item
      )
    );

    toast.success("Submission sent for review.", "Re-submit successful");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">Zenvyro Labs</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">📤 My Submissions</h1>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          New Submission
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted">{submissions.length} submissions</p>
          </div>

          {submissions.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedId(entry.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                entry.id === selectedId
                  ? "border-indigo-200 bg-indigo-50 shadow-sm"
                  : "border-line bg-surface hover:border-indigo-200 hover:bg-surface/90"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{entry.title}</h2>
                  <p className="mt-1 text-sm text-muted">{entry.submittedOn}</p>
                </div>
                <StatusPill status={entry.status} />
              </div>

              {entry.status === "approved" ? (
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald">
                  <CheckCircle2 size={16} />
                  +{entry.points} pts
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm font-medium text-amber">
                  <PencilLine size={16} />
                  Needs revision
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-amber">
            <Sparkles size={18} />
            <span className="text-sm font-semibold uppercase tracking-[0.08em]">Revision</span>
          </div>

          <div className="mt-5 rounded-xl border border-amber/20 bg-amber-soft/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-amber">Teacher Feedback</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {selectedSubmission?.feedback || "No feedback available."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Task</label>
              <input
                name="task"
                value={form.task}
                onChange={handleChange}
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-indigo-400"
                readOnly
              />
            </div>

            <div>
              <label htmlFor="links" className="mb-2 block text-sm font-medium text-ink">Links (GitHub, Figma, etc.)</label>
              <input
                id="links"
                name="links"
                value={form.links}
                onChange={handleChange}
                placeholder="https://github.com/your-project"
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">File Upload</label>
              <div className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas px-4 py-5 text-center transition hover:border-indigo-300">
                <CloudUpload size={22} className="text-muted" />
                <p className="mt-2 text-sm font-medium text-ink">Click or drag files here</p>
                <p className="mt-1 text-xs text-muted">PDF, DOCX, ZIP, PNG, JPG, MP4</p>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-2 block text-sm font-medium text-ink">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Add any clarifications or updates..."
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-slate-soft"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Re-submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
