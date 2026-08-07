const PRIORITY_STYLES = {
  low: "bg-slate-soft text-muted",
  medium: "bg-indigo-50 text-indigo-600",
  high: "bg-amber-soft text-amber",
  urgent: "bg-rose-soft text-rose",
};

const TASK_STATUS_STYLES = {
  todo: "bg-slate-soft text-muted",
  in_progress: "bg-indigo-50 text-indigo-600",
  review: "bg-amber-soft text-amber",
  completed: "bg-emerald-soft text-emerald",
};

const PROJECT_STATUS_STYLES = {
  planning: "bg-slate-soft text-muted",
  active: "bg-indigo-50 text-indigo-600",
  on_hold: "bg-amber-soft text-amber",
  completed: "bg-emerald-soft text-emerald",
  cancelled: "bg-rose-soft text-rose",
};

function labelize(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}>
      {priority}
    </span>
  );
}

export function TaskStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TASK_STATUS_STYLES[status] || TASK_STATUS_STYLES.todo}`}>
      {labelize(status)}
    </span>
  );
}

export function ProjectStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PROJECT_STATUS_STYLES[status] || PROJECT_STATUS_STYLES.planning}`}>
      {labelize(status)}
    </span>
  );
}
