import { Router } from "express";
import { get, all, run } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest } from "../utils/apiError.js";
import { getTaskOrThrow, assertCanViewTask } from "../utils/access.js";
import { createCommentSchema, parseOrThrow } from "../utils/validators.js";
import { notifyMany } from "../utils/notifications.js";
import { logActivity } from "../utils/activityLog.js";

const router = Router();
router.use(requireAuth);

router.get("/:taskId", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.taskId);
    await assertCanViewTask(req.user, task);
    const comments = await all(
      `SELECT c.*, u.name as author_name, u.role as author_role
       FROM task_comments c JOIN users u ON u.id = c.user_id
       WHERE c.task_id = ? ORDER BY c.created_at ASC`,
      [task.id]
    );
    res.json({ comments });
  } catch (err) { next(err); }
});

router.post("/:taskId", async (req, res, next) => {
  try {
    const task    = await getTaskOrThrow(req.params.taskId);
    const project = await assertCanViewTask(req.user, task);
    const data    = parseOrThrow(createCommentSchema, req.body, badRequest);

    const result = await run(
      "INSERT INTO task_comments (task_id, user_id, message) VALUES (?, ?, ?)",
      [task.id, req.user.id, data.message]
    );
    const interested = [task.assignee_id, project.manager_id].filter(Boolean);
    await notifyMany({
      userIds: interested, actingUserId: req.user.id, type: "new_comment",
      message: `${req.user.name} commented on "${task.title}".`,
      projectId: project.id, taskId: task.id,
    });
    await logActivity({
      actorId: req.user.id, action: "comment_added", entity: "comment",
      entityId: Number(result.lastInsertRowid),
      detail: `Commented on "${task.title}"`,
      projectId: project.id, taskId: task.id,
    });
    const comment = await get(
      `SELECT c.*, u.name as author_name, u.role as author_role
       FROM task_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [Number(result.lastInsertRowid)]
    );
    res.status(201).json({ comment });
  } catch (err) { next(err); }
});

export default router;
