import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api } from "../../lib/api";
import { PriorityBadge } from "../../components/ui/Badges";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_DOT = {
  todo:        "bg-muted/50",
  in_progress: "bg-indigo-500",
  review:      "bg-amber",
  completed:   "bg-emerald",
};

function buildCalendar(year, month) {
  // month is 0-indexed
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const prevDays  = new Date(year, month, 0).getDate();

  const cells = [];

  // Leading blanks (previous month)
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), current: false });
  }
  // Current month
  for (let d = 1; d <= daysInMon; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  // Trailing blanks
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++) {
    cells.push({ date: new Date(year, month + 1, d), current: false });
  }
  return cells;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function isToday(d) { return isSameDay(d, new Date()); }

function toLocalDate(str) {
  // str is YYYY-MM-DD; treat as local, not UTC
  if (!str) return null;
  const [y, m, day] = str.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export default function Calendar() {
  const now = new Date();
  const [year,  setYear]   = useState(now.getFullYear());
  const [month, setMonth]  = useState(now.getMonth());
  const [tasks, setTasks]  = useState([]);
  const [selected, setSelected] = useState(null); // Date | null
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    // Fetch all tasks the user can see (my tasks + project tasks)
    async function loadTasks() {
      setLoading(true);
      try {
        // My tasks (members) + project tasks (manager/admin via projects list)
        const [myRes, projectsRes] = await Promise.all([
          api.getMyTasks().catch(() => ({ tasks: [] })),
          api.getProjects().catch(() => ({ projects: [] })),
        ]);

        const myTasks = myRes.tasks || [];
        const allTasksMap = new Map(myTasks.map((t) => [t.id, t]));

        // Fetch tasks from each visible project (admin/manager)
        const projectTaskFetches = (projectsRes.projects || []).map((p) =>
          api.getProjectTasks(p.id).then((r) => {
            (r.tasks || []).forEach((t) => {
              if (!allTasksMap.has(t.id)) {
                allTasksMap.set(t.id, { ...t, project_name: p.name });
              }
            });
          }).catch(() => {})
        );
        await Promise.all(projectTaskFetches);

        setTasks([...allTasksMap.values()].filter((t) => t.due_date));
      } finally { setLoading(false); }
    }
    loadTasks();
  }, []);

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelected(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelected(null);
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null); }

  const cells = useMemo(() => buildCalendar(year, month), [year, month]);

  // Map date-string → tasks[]
  const tasksByDate = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return map;
  }, [tasks]);

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const selectedTasks = selected ? (tasksByDate.get(dateKey(selected)) || []) : [];

  // Count tasks due this month (current cells)
  const monthTaskCount = cells.filter((c) => c.current).reduce((sum, c) => {
    return sum + (tasksByDate.get(dateKey(c.date))?.length || 0);
  }, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Calendar</h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? "Loading tasks…" : `${monthTaskCount} task${monthTaskCount !== 1 ? "s" : ""} due in ${MONTHS[month]}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday}
            className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-muted hover:text-ink">
            Today
          </button>
          <button onClick={prev} aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-ink">
            {MONTHS[month]} {year}
          </span>
          <button onClick={next} aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-6 lg:flex lg:gap-6">
        <div className="flex-1 rounded-xl border border-line bg-surface overflow-hidden">
          <div className="cal-grid border-b border-line">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {d}
              </div>
            ))}
          </div>

          <div className="cal-grid">
            {cells.map((cell, idx) => {
              const key       = dateKey(cell.date);
              const cellTasks = tasksByDate.get(key) || [];
              const active    = selected && isSameDay(cell.date, selected);
              const today     = isToday(cell.date);

              return (
                <button
                  key={idx}
                  onClick={() => setSelected(active ? null : cell.date)}
                  className={`relative min-h-[80px] border-b border-r border-line p-2 text-left align-top transition-colors
                    ${!cell.current ? "opacity-35" : ""}
                    ${active ? "bg-indigo-50 ring-2 ring-inset ring-indigo-500" : "hover:bg-canvas"}
                  `}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold
                    ${today ? "bg-indigo-600 text-white" : "text-ink"}`}>
                    {cell.date.getDate()}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {cellTasks.slice(0, 3).map((t) => (
                      <div key={t.id}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-[0.65rem] font-medium leading-tight
                          ${t.status === "completed" ? "line-through opacity-50 text-muted" : "text-ink"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[t.status] || "bg-muted"}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {cellTasks.length > 3 ? (
                      <p className="pl-1 text-[0.65rem] text-indigo-600 font-medium">
                        +{cellTasks.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 lg:mt-0 lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-line bg-surface p-4 sticky top-6">
            {selected ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-ink">
                    {selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </h2>
                  <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-ink">Clear</button>
                </div>

                {selectedTasks.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-line py-8 text-center">
                    <CalendarDays size={22} className="mx-auto text-muted/40" />
                    <p className="mt-2 text-sm text-muted">No tasks due.</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selectedTasks.map((t) => (
                      <Link key={t.id} to={`/tasks/${t.id}`}
                        className="flex flex-col rounded-lg border border-line bg-surface-2 p-3 hover:border-indigo-400 transition-colors">
                        <span className={`text-sm font-medium text-ink ${t.status === "completed" ? "line-through opacity-60" : ""}`}>
                          {t.title}
                        </span>
                        {t.project_name ? (
                          <span className="mt-0.5 text-xs text-muted">{t.project_name}</span>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <span className={`flex items-center gap-1 text-xs ${STATUS_DOT[t.status] ? "" : ""}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[t.status] || "bg-muted"}`} />
                            <span className="capitalize text-muted">{t.status?.replace("_", " ")}</span>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <CalendarDays size={28} className="mx-auto text-muted/30" />
                <p className="mt-3 text-sm font-medium text-ink">Select a day</p>
                <p className="mt-1 text-xs text-muted">Click any date to see tasks due that day.</p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">Status</p>
            {[
              ["in_progress", "bg-indigo-500", "In Progress"],
              ["review",      "bg-amber",      "In Review"],
              ["completed",   "bg-emerald",    "Completed"],
              ["todo",        "bg-muted/50",   "To Do"],
            ].map(([, cls, label]) => (
              <div key={label} className="flex items-center gap-2 mb-1.5">
                <span className={`h-2 w-2 rounded-full ${cls}`} />
                <span className="text-xs text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
