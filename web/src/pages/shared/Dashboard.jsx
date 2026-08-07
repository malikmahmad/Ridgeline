import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Circle, Clock, FolderKanban,
  ListTodo, TrendingUp, Users,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate, statusLabel } from "../../lib/format";
import { PriorityBadge, ProjectStatusBadge, TaskStatusBadge } from "../../components/ui/Badges";

function StatCard({ icon: Icon, label, value, sub, accent = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-soft text-emerald",
    amber: "bg-amber-soft text-amber",
    rose: "bg-rose-soft text-rose",
  };
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[accent]}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

const STATUS_CHART_COLORS = {
  planning: "#a0aec0",
  active: "#4f52d6",
  on_hold: "#b3720a",
  completed: "#157a4f",
  cancelled: "#b3323f",
};

function AdminView({ data }) {
  const barData = data.projectsByStatus.map((p) => ({
    name: statusLabel(p.status),
    count: p.count,
    fill: STATUS_CHART_COLORS[p.status] || "#4f52d6",
  }));

  const pieData = data.tasksByStatus?.map((t) => ({
    name: statusLabel(t.status),
    value: t.count,
  })) || [];

  const PIE_COLORS = ["#a0aec0", "#4f52d6", "#b3720a", "#157a4f"];

  const completionRate = data.taskCount > 0
    ? Math.round((data.completedTaskCount / data.taskCount) * 100)
    : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={data.userCount} />
        <StatCard icon={FolderKanban} label="Active projects" value={data.activeProjectCount} sub={`${data.projectCount} total`} accent="indigo" />
        <StatCard icon={CheckCircle2} label="Tasks completed" value={data.completedTaskCount} sub={`${completionRate}% completion rate`} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Overdue tasks" value={data.overdueTaskCount || 0} accent={data.overdueTaskCount > 0 ? "rose" : "indigo"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Projects by status</h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e2e8" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666b78" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#666b78" }} />
                <Tooltip cursor={{ fill: "#eef0ff" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Tasks by status</h2>
          {pieData.length > 0 ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="h-52 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((d, idx) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-muted">{d.name}</span>
                    <span className="font-medium text-ink">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No tasks yet.</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Recent projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {data.recentProjects.length === 0 ? (
              <p className="py-4 text-sm text-muted">No projects yet.</p>
            ) : (
              data.recentProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 text-sm hover:bg-canvas -mx-1 px-1 rounded">
                  <div>
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-muted">PM: {p.manager_name || "Unassigned"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{p.progress || 0}%</span>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {data.overdueTaskCount > 0 ? (
          <div className="rounded-xl border border-rose-soft bg-rose-soft/30 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose" />
              <h2 className="font-semibold text-rose">Overdue tasks</h2>
            </div>
            <div className="mt-3 divide-y divide-rose-soft/50">
              {(data.overdueTasks || []).slice(0, 5).map((t) => (
                <Link key={t.id} to={`/tasks/${t.id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:bg-rose-soft/20 -mx-1 px-1 rounded">
                  <div>
                    <p className="font-medium text-ink">{t.title}</p>
                    <p className="text-xs text-muted">{t.project_name}</p>
                  </div>
                  <span className="text-xs text-rose">{formatDate(t.due_date)}</span>
                </Link>
              ))}
              {data.overdueTaskCount > 5 ? (
                <p className="pt-2.5 text-xs text-rose">+{data.overdueTaskCount - 5} more overdue</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-surface p-5">
            <CheckCircle2 size={28} className="text-emerald" />
            <p className="mt-2 font-medium text-ink">No overdue tasks</p>
            <p className="mt-1 text-sm text-muted">All tasks are on track.</p>
          </div>
        )}
      </div>
    </>
  );
}

function ManagerView({ data }) {
  const completionRate = data.taskCount > 0
    ? Math.round((data.completedTaskCount / data.taskCount) * 100)
    : 0;

  const progressData = data.projects.map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    progress: p.progress || 0,
  }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FolderKanban} label="Assigned projects" value={data.projectCount} accent="indigo" />
        <StatCard icon={ListTodo} label="Total tasks" value={data.taskCount} sub={`${data.completedTaskCount} completed`} />
        <StatCard icon={TrendingUp} label="Completion rate" value={`${completionRate}%`} accent="emerald" />
        <StatCard icon={Users} label="Team members" value={data.teamMemberCount} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">Project progress</h2>
          {progressData.length > 0 ? (
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e2e8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666b78" }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#666b78" }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="progress" fill="#4f52d6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No projects yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Your projects</h2>
            <Link to="/projects" className="text-sm text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {data.projects.length === 0 ? (
              <p className="py-6 text-sm text-muted">No projects assigned yet.</p>
            ) : (
              data.projects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}
                  className="flex items-center justify-between py-3 text-sm hover:bg-canvas -mx-1 px-1 rounded">
                  <div>
                    <p className="font-medium text-ink">{p.name}</p>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-indigo-600" style={{ width: `${p.progress || 0}%` }} />
                    </div>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-amber" />
          <h2 className="font-semibold text-ink">Upcoming deadlines</h2>
        </div>
        <div className="mt-3 divide-y divide-line">
          {data.upcomingDeadlines.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing due in the next few days.</p>
          ) : (
            data.upcomingDeadlines.map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-canvas -mx-1 px-1 rounded">
                <div>
                  <p className="text-ink">{t.title}</p>
                  <p className="text-xs text-muted">{t.project_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <TaskStatusBadge status={t.status} />
                  <span className="text-xs text-amber font-medium">{formatDate(t.due_date)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function MemberView({ data }) {
  const byStatus = Object.fromEntries(data.tasksByStatus.map((t) => [t.status, t.count]));
  const total = data.tasksByStatus.reduce((sum, t) => sum + t.count, 0);
  const done = byStatus.completed || 0;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Circle} label="To do" value={byStatus.todo || 0} />
        <StatCard icon={ListTodo} label="In progress" value={byStatus.in_progress || 0} accent="indigo" />
        <StatCard icon={ListTodo} label="In review" value={byStatus.review || 0} accent="amber" />
        <StatCard icon={CheckCircle2} label="Completed" value={done} accent="emerald" />
      </div>

      {total > 0 ? (
        <div className="mt-4 rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Overall completion</h2>
            <span className="text-sm font-semibold text-indigo-600">{completionRate}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">{done} of {total} tasks completed across {data.projectCount} project{data.projectCount !== 1 ? "s" : ""}</p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber" />
            <h2 className="font-semibold text-ink">Upcoming deadlines</h2>
          </div>
          <Link to="/my-tasks" className="text-sm text-indigo-600 hover:underline">View all tasks</Link>
        </div>
        <div className="mt-3 divide-y divide-line">
          {data.upcomingDeadlines.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing due soon — you're caught up.</p>
          ) : (
            data.upcomingDeadlines.map((t) => (
              <Link key={t.id} to={`/tasks/${t.id}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-canvas -mx-1 px-1 rounded">
                <div>
                  <p className="text-ink">{t.title}</p>
                  <p className="text-xs text-muted">{t.project_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <span className="text-xs text-amber font-medium">{formatDate(t.due_date)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded bg-surface" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />)}
        </div>
      </div>
    );
  }
  if (!data) return <p className="text-rose">Couldn't load dashboard data.</p>;

  const ROLE_SUBTITLE = {
    admin: "System-wide overview",
    manager: "Your projects at a glance",
    member: "Your personal workspace",
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">{ROLE_SUBTITLE[data.role]}</p>
      </div>

      <div className="mt-6">
        {data.role === "admin" ? <AdminView data={data} /> : null}
        {data.role === "manager" ? <ManagerView data={data} /> : null}
        {data.role === "member" ? <MemberView data={data} /> : null}
      </div>
    </div>
  );
}
