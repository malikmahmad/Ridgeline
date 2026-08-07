export function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str.length <= 10 ? str : str.replace(" ", "T") + (str.includes("T") ? "" : "Z"));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(str) {
  if (!str) return "—";
  const d = new Date(str.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timeAgo(str) {
  const d       = new Date(str.replace(" ", "T") + "Z");
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60)  return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours   = Math.floor(minutes / 60);
  if (hours   < 24)  return `${hours}h ago`;
  const days    = Math.floor(hours / 24);
  if (days    < 7)   return `${days}d ago`;
  return formatDate(str);
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === "completed") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const LABELS = {
  todo:        "To Do",
  in_progress: "In Progress",
  review:      "Review",
  completed:   "Completed",
  planning:    "Planning",
  active:      "Active",
  on_hold:     "On Hold",
  cancelled:   "Cancelled",
};

export function statusLabel(status) {
  return LABELS[status] || status;
}

export const STATUS_LABELS = LABELS;
