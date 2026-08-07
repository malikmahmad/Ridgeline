import { Router } from "express";
import { get, all } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getAdminStats() {
  const [userCount, projectCount, activeCount, taskCount, doneCount, overdueCount] = await Promise.all([
    get("SELECT COUNT(*) as c FROM users"),
    get("SELECT COUNT(*) as c FROM projects"),
    get("SELECT COUNT(*) as c FROM projects WHERE status = 'active'"),
    get("SELECT COUNT(*) as c FROM tasks"),
    get("SELECT COUNT(*) as c FROM tasks WHERE status = 'completed'"),
    get(`SELECT COUNT(*) as c FROM tasks
         WHERE status != 'completed' AND due_date IS NOT NULL AND date(due_date) < date('now')`),
  ]);

  const [byStatus, tasksByStatus] = await Promise.all([
    all("SELECT status, COUNT(*) as count FROM projects GROUP BY status"),
    all("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
  ]);

  const recent = await all(
    `SELECT p.id, p.name, p.status, p.manager_id,
            u.name as manager_name,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as completed_count
     FROM projects p LEFT JOIN users u ON u.id = p.manager_id
     ORDER BY p.created_at DESC LIMIT 8`
  );

  const overdueTasks = await all(
    `SELECT t.id, t.title, t.due_date, p.name as project_name
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.status != 'completed' AND t.due_date IS NOT NULL AND date(t.due_date) < date('now')
     ORDER BY t.due_date ASC LIMIT 10`
  );

  return {
    role:               "admin",
    userCount:          Number(userCount.c),
    projectCount:       Number(projectCount.c),
    activeProjectCount: Number(activeCount.c),
    taskCount:          Number(taskCount.c),
    completedTaskCount: Number(doneCount.c),
    overdueTaskCount:   Number(overdueCount.c),
    projectsByStatus:   byStatus,
    tasksByStatus,
    recentProjects:     recent.map((p) => ({
      ...p,
      progress: Number(p.task_count) > 0
        ? Math.round((Number(p.completed_count) / Number(p.task_count)) * 100)
        : 0,
    })),
    overdueTasks,
  };
}

async function getManagerStats(userId) {
  const projects = await all("SELECT * FROM projects WHERE manager_id = ?", [userId]);
  const ids      = projects.map((p) => p.id);

  let taskCount = 0, doneCount = 0, deadlines = [], memberCount = 0;

  if (ids.length > 0) {
    const ph = ids.map(() => "?").join(",");
    const [tc, dc, mc] = await Promise.all([
      get(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${ph})`, ids),
      get(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${ph}) AND status = 'completed'`, ids),
      get(`SELECT COUNT(DISTINCT user_id) as c FROM project_members WHERE project_id IN (${ph})`, ids),
    ]);
    taskCount   = Number(tc.c);
    doneCount   = Number(dc.c);
    memberCount = Number(mc.c);
    deadlines   = await all(
      `SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE t.project_id IN (${ph}) AND t.status != 'completed' AND t.due_date IS NOT NULL
       ORDER BY t.due_date ASC LIMIT 8`,
      ids
    );
  }

  const enriched = await Promise.all(projects.map(async (p) => {
    const totals = await get(
      `SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
       FROM tasks WHERE project_id = ?`,
      [p.id]
    );
    const t = Number(totals.total) || 0;
    const d = Number(totals.completed) || 0;
    return { ...p, taskCount: t, completedTaskCount: d, progress: t ? Math.round((d / t) * 100) : 0 };
  }));

  return {
    role: "manager", projectCount: projects.length, taskCount, completedTaskCount: doneCount,
    teamMemberCount: memberCount, upcomingDeadlines: deadlines, projects: enriched,
  };
}

async function getMemberStats(userId) {
  const [tasksByStatus, deadlines, pc] = await Promise.all([
    all("SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY status", [userId]),
    all(
      `SELECT t.*, p.name as project_name FROM tasks t JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = ? AND t.status != 'completed' AND t.due_date IS NOT NULL
       ORDER BY t.due_date ASC LIMIT 6`,
      [userId]
    ),
    get("SELECT COUNT(*) as c FROM project_members WHERE user_id = ?", [userId]),
  ]);
  return { role: "member", tasksByStatus, upcomingDeadlines: deadlines, projectCount: Number(pc.c) };
}

router.get("/", async (req, res, next) => {
  try {
    if (req.user.role === "admin")   return res.json(await getAdminStats());
    if (req.user.role === "manager") return res.json(await getManagerStats(req.user.id));
    return res.json(await getMemberStats(req.user.id));
  } catch (err) { next(err); }
});

export default router;
