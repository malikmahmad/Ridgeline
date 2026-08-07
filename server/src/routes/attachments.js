import { Router } from "express";
import multer from "multer";
import { get, all, run } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { getTaskOrThrow, assertCanViewTask } from "../utils/access.js";
import { logActivity } from "../utils/activityLog.js";
import { forbidden, notFound } from "../utils/apiError.js";

const MAX_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    const blocked = /\.(exe|sh|bat|cmd|ps1|msi|dll|so|dylib)$/i;
    if (blocked.test(file.originalname)) return cb(new Error("That file type is not allowed."));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

router.get("/:taskId", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.taskId);
    await assertCanViewTask(req.user, task);
    const rows = await all(
      `SELECT a.id, a.task_id, a.user_id, a.filename, a.mime_type, a.size_bytes, a.created_at,
              u.name as uploader_name
       FROM task_attachments a JOIN users u ON u.id = a.user_id
       WHERE a.task_id = ? ORDER BY a.created_at DESC`,
      [task.id]
    );
    res.json({ attachments: rows });
  } catch (err) { next(err); }
});

router.post("/:taskId", upload.single("file"), async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.taskId);
    await assertCanViewTask(req.user, task);
    if (!req.file) return res.status(400).json({ error: "No file received." });

    const data64 = req.file.buffer.toString("base64");
    const result = await run(
      `INSERT INTO task_attachments (task_id, user_id, filename, stored_as, mime_type, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task.id, req.user.id, req.file.originalname, data64, req.file.mimetype, req.file.size]
    );

    await logActivity({
      actorId: req.user.id, action: "file_attached", entity: "task",
      entityId: task.id, detail: `Attached "${req.file.originalname}"`,
      projectId: task.project_id, taskId: task.id,
    });

    const attachment = await get(
      `SELECT a.id, a.task_id, a.user_id, a.filename, a.mime_type, a.size_bytes, a.created_at,
              u.name as uploader_name
       FROM task_attachments a JOIN users u ON u.id = a.user_id WHERE a.id = ?`,
      [Number(result.lastInsertRowid)]
    );
    res.status(201).json({ attachment });
  } catch (err) { next(err); }
});

router.get("/:taskId/download/:attachmentId", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.taskId);
    await assertCanViewTask(req.user, task);
    const att = await get(
      "SELECT * FROM task_attachments WHERE id = ? AND task_id = ?",
      [req.params.attachmentId, task.id]
    );
    if (!att) throw notFound("Attachment not found.");
    const buffer = Buffer.from(att.stored_as, "base64");
    res.setHeader("Content-Type",        att.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${att.filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
});

router.delete("/:taskId/:attachmentId", async (req, res, next) => {
  try {
    const task = await getTaskOrThrow(req.params.taskId);
    await assertCanViewTask(req.user, task);
    const att = await get(
      "SELECT * FROM task_attachments WHERE id = ? AND task_id = ?",
      [req.params.attachmentId, task.id]
    );
    if (!att) throw notFound("Attachment not found.");
    const canDelete = req.user.role === "admin" || req.user.role === "manager" || att.user_id === req.user.id;
    if (!canDelete) throw forbidden("You can only delete files you uploaded.");
    await run("DELETE FROM task_attachments WHERE id = ?", [att.id]);
    res.json({ message: "Attachment deleted." });
  } catch (err) { next(err); }
});

export default router;
