import { Router } from "express";
import { get, all, run } from "../db/connection.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { badRequest, conflict } from "../utils/apiError.js";
import {
  getProjectOrThrow, assertCanViewProject,
  assertCanManageProject,
} from "../utils/access.js";
import {
  createProjectSchema, updateProjectSchema,
  projectManagerUpdateSchema, addMemberSchema, parseOrThrow,
} from "../utils/validators.js";
import { notify } from "../utils/notifications.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth);

async function withProgress(project) {
  const totals = await get(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM tasks WHERE project_id = ?`,
    [project.id]
  );
  const manager = project.manager_id
    ? await get("SELECT id, name, email FROM users WHERE id = ?", [project.manager_id])
    : null;
  const mc = await get(
    "SELECT COUNT(*) as count FROM project_members WHERE project_id = ?",
    [project.id]
  );
  const total = Number(totals.total) || 0;
  const done  = Number(totals.completed) || 0;
  return {
    ...project,
    manager,
    taskCount:          total,
    completedTaskCount: done,
    progress:           total ? Math.round((done / total) * 100) : 0,
    memberCount:        Number(mc.count) || 0,
  };
}

router.get("/", async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === "admin") {
      rows = await all("SELECT * FROM projects ORDER BY created_at DESC");
    } else if (req.user.role === "manager") {
      rows = await all("SELECT * FROM projects WHERE manager_id = ? ORDER BY created_at DESC", [req.user.id]);
    } else {
      rows = await all(
        `SELECT p.* FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         WHERE pm.user_id = ? ORDER BY p.created_at DESC`,
        [req.user.id]
      );
    }
    const projects = await Promise.all(rows.map(withProgress));
    res.json({ projects });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await assertCanViewProject(req.user, project);
    res.json({ project: await withProgress(project) });
  } catch (err) { next(err); }
});

router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const data    = parseOrThrow(createProjectSchema, req.body, badRequest);
    const manager = await get("SELECT * FROM users WHERE id = ? AND role = 'manager'", [data.managerId]);
    if (!manager) throw badRequest("Select a valid Project Manager.");

    const result = await run(
      `INSERT INTO projects (name, description, start_date, end_date, priority, status, manager_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.description, data.startDate || null, data.endDate || null,
       data.priority, data.status, data.managerId, req.user.id]
    );
    const projectId = Number(result.lastInsertRowid);

    await notify({
      userId: data.managerId, actingUserId: req.user.id, type: "added_to_project",
      message: `You were assigned as Project Manager for "${data.name}".`,
      projectId,
    });
    await logActivity({
      actorId: req.user.id, action: "project_created", entity: "project",
      entityId: projectId, detail: `Created project "${data.name}"`, projectId,
    });

    const project = await get("SELECT * FROM projects WHERE id = ?", [projectId]);
    res.status(201).json({ project: await withProgress(project) });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await assertCanManageProject(req.user, project);

    if (req.user.role === "admin") {
      const data = parseOrThrow(updateProjectSchema, req.body, badRequest);
      let managerId = project.manager_id;
      if (data.managerId && data.managerId !== project.manager_id) {
        const mgr = await get("SELECT * FROM users WHERE id = ? AND role = 'manager'", [data.managerId]);
        if (!mgr) throw badRequest("Select a valid Project Manager.");
        managerId = data.managerId;
        await notify({
          userId: managerId, actingUserId: req.user.id, type: "added_to_project",
          message: `You were assigned as Project Manager for "${data.name}".`,
          projectId: project.id,
        });
      }
      await run(
        `UPDATE projects SET name=?, description=?, start_date=?, end_date=?,
         priority=?, status=?, manager_id=?, updated_at=datetime('now') WHERE id=?`,
        [data.name, data.description, data.startDate || null, data.endDate || null,
         data.priority, data.status, managerId, project.id]
      );
    } else {
      const data = parseOrThrow(projectManagerUpdateSchema, req.body, badRequest);
      await run(
        `UPDATE projects SET name=?, description=?, start_date=?, end_date=?,
         priority=?, status=?, updated_at=datetime('now') WHERE id=?`,
        [data.name, data.description, data.startDate || null, data.endDate || null,
         data.priority, data.status, project.id]
      );
    }

    const updated = await get("SELECT * FROM projects WHERE id = ?", [project.id]);
    await logActivity({
      actorId: req.user.id, action: "project_updated", entity: "project",
      entityId: project.id, detail: `Updated project "${updated.name}"`, projectId: project.id,
    });
    res.json({ project: await withProgress(updated) });
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await run("DELETE FROM projects WHERE id = ?", [project.id]);
    res.json({ message: "Project deleted." });
  } catch (err) { next(err); }
});

router.get("/:id/members", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await assertCanViewProject(req.user, project);
    const members = await all(
      `SELECT u.id, u.name, u.email, u.title
       FROM project_members pm JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ? ORDER BY u.name ASC`,
      [project.id]
    );
    res.json({ members });
  } catch (err) { next(err); }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await assertCanManageProject(req.user, project);
    const data   = parseOrThrow(addMemberSchema, req.body, badRequest);
    const member = await get("SELECT * FROM users WHERE id = ? AND role = 'member'", [data.userId]);
    if (!member) throw badRequest("Select a valid team member.");
    const already = await get(
      "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?",
      [project.id, data.userId]
    );
    if (already) throw conflict("This person is already on the project.");

    await run("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)", [project.id, data.userId]);
    await notify({
      userId: data.userId, actingUserId: req.user.id, type: "added_to_project",
      message: `You were added to the project "${project.name}".`, projectId: project.id,
    });
    await logActivity({
      actorId: req.user.id, action: "member_added", entity: "project",
      entityId: project.id, detail: `Added a team member to "${project.name}"`, projectId: project.id,
    });
    res.status(201).json({ message: "Team member added." });
  } catch (err) { next(err); }
});

router.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.id);
    await assertCanManageProject(req.user, project);
    await run(
      "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
      [project.id, req.params.userId]
    );
    await logActivity({
      actorId: req.user.id, action: "member_removed", entity: "project",
      entityId: project.id, detail: `Removed a team member from "${project.name}"`, projectId: project.id,
    });
    res.json({ message: "Team member removed." });
  } catch (err) { next(err); }
});

export default router;
