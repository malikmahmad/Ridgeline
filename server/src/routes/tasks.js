import { Router } from "express";
import { get, all, run } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest } from "../utils/apiError.js";
import {
  getProjectOrThrow, assertCanViewProject, assertCanManageProject,
  getTaskOrThrow, assertCanViewTask, assertCanManageTask,
  assertCanUpdateTaskStatus, isProjectMember,
} from "../utils/access.js";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, parseOrThrow } from "../utils/validators.js";
import { notify } from "../utils/notifications.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth);

async function withAssignee(task) {
  const assignee = task.assignee_id
    ? await get("SELECT id, name, email FROM users WHERE id = ?", [task.assignee_id])
    : null;
  const cc = await get("SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?", [task.id]);
  return { ...task, assignee, commentCount: Number(cc.count) || 0 };
}

router.get("/project/:projectId", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.projectId);
    await assertCanViewProject(req.user, project);
    const where  = ["project_id = ?"];
    const params = [project.id];
    if (req.query.status)     { where.push("status = ?");      params.push(req.query.status); }
    if (req.query.assigneeId) { where.push("assignee_id = ?"); params.push(req.query.assigneeId); }
    const tasks = await all(
      `SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY created_at DESC`,
      params
    );
    res.json({ tasks: await Promise.all(tasks.map(withAssignee)) });
  } catch (err) { next(err); }
});

router.get("/my", async (req, res, next) => {
  try {
    const tasks = await all(
      `SELECT t.*, p.name as project_name FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_id = ?
       ORDER BY CASE t.status WHEN 'completed' THEN 1 ELSE 0 END,
                t.due_date IS NULL, t.due_date ASC`,
      [req.user.id]
    );
    res.json({ tasks: await Promise.all(tasks.map(withAssignee)) });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.id);
    await assertCanViewTask(req.user, task);
    res.json({ task: await withAssignee(task) });
  } catch (err) { next(err); }
});

router.post("/project/:projectId", async (req, res, next) => {
  try {
    const project = await getProjectOrThrow(req.params.projectId);
    await assertCanManageProject(req.user, project);
    const data = parseOrThrow(createTaskSchema, req.body, badRequest);

    if (data.assigneeId && !(await isProjectMember(project.id, data.assigneeId))) {
      throw badRequest("You can only assign tasks to members already on this project.");
    }
    const result = await run(
      `INSERT INTO tasks (project_id, title, description, assignee_id, priority, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project.id, data.title, data.description, data.assigneeId || null,
       data.priority, data.dueDate || null, req.user.id]
    );
    const taskId = Number(result.lastInsertRowid);
    if (data.assigneeId) {
      await notify({
        userId: data.assigneeId, actingUserId: req.user.id, type: "task_assigned",
        message: `You were assigned a new task: "${data.title}" in ${project.name}.`,
        projectId: project.id, taskId,
      });
    }
    await logActivity({
      actorId: req.user.id, action: "task_created", entity: "task",
      entityId: taskId, detail: `Created task "${data.title}"`, projectId: project.id, taskId,
    });
    const task = await get("SELECT * FROM tasks WHERE id = ?", [taskId]);
    res.status(201).json({ task: await withAssignee(task) });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const task    = await getTaskOrThrow(req.params.id);
    const project = await assertCanManageTask(req.user, task);
    const data    = parseOrThrow(updateTaskSchema, req.body, badRequest);

    if (data.assigneeId && !(await isProjectMember(project.id, data.assigneeId))) {
      throw badRequest("You can only assign tasks to members already on this project.");
    }
    const reassigned = data.assigneeId !== undefined && data.assigneeId !== task.assignee_id;
    await run(
      `UPDATE tasks SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         assignee_id = ?,
         priority    = COALESCE(?, priority),
         due_date    = ?,
         updated_at  = datetime('now')
       WHERE id = ?`,
      [
        data.title       ?? task.title,
        data.description ?? task.description,
        data.assigneeId !== undefined ? data.assigneeId : task.assignee_id,
        data.priority    ?? task.priority,
        data.dueDate !== undefined ? data.dueDate || null : task.due_date,
        task.id,
      ]
    );
    if (reassigned && data.assigneeId) {
      await notify({
        userId: data.assigneeId, actingUserId: req.user.id, type: "task_assigned",
        message: `You were assigned to "${task.title}" in ${project.name}.`,
        projectId: project.id, taskId: task.id,
      });
    }
    const updated = await get("SELECT * FROM tasks WHERE id = ?", [task.id]);
    await logActivity({
      actorId: req.user.id, action: "task_updated", entity: "task",
      entityId: task.id, detail: `Updated task "${updated.title}"`,
      projectId: project.id, taskId: task.id,
    });
    res.json({ task: await withAssignee(updated) });
  } catch (err) { next(err); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const task    = await getTaskOrThrow(req.params.id);
    const project = await assertCanUpdateTaskStatus(req.user, task);
    const data    = parseOrThrow(updateTaskStatusSchema, req.body, badRequest);
    await run("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [data.status, task.id]);
    if (project.manager_id && project.manager_id !== req.user.id) {
      await notify({
        userId: project.manager_id, actingUserId: req.user.id, type: "task_status_changed",
        message: `"${task.title}" was moved to ${data.status.replace("_", " ")} in ${project.name}.`,
        projectId: project.id, taskId: task.id,
      });
    }
    const updated = await get("SELECT * FROM tasks WHERE id = ?", [task.id]);
    await logActivity({
      actorId: req.user.id, action: "task_status_changed", entity: "task",
      entityId: task.id, detail: `Moved "${task.title}" to ${data.status.replace("_", " ")}`,
      projectId: project.id, taskId: task.id,
    });
    res.json({ task: await withAssignee(updated) });
  } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.id);
    await assertCanManageTask(req.user, task);
    await logActivity({
      actorId: req.user.id, action: "task_deleted", entity: "task",
      entityId: task.id, detail: `Deleted task "${task.title}"`,
      projectId: task.project_id, taskId: task.id,
    });
    await run("DELETE FROM tasks WHERE id = ?", [task.id]);
    res.json({ message: "Task deleted." });
  } catch (err) { next(err); }
});

export default router;
