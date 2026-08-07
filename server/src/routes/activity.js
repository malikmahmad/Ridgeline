import { Router } from "express";
import { all } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || "60", 10), 200);
    const offset = Math.max(parseInt(req.query.offset || "0",  10), 0);
    const pid    = req.query.projectId ? parseInt(req.query.projectId, 10) : null;

    const base = `SELECT a.*, u.name as actor_name, u.role as actor_role
                  FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id`;

    if (req.user.role === "admin") {
      const rows = pid
        ? await all(`${base} WHERE a.project_id = ? ORDER BY a.created_at DESC LIMIT ? OFFSET ?`, [pid, limit, offset])
        : await all(`${base} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
      return res.json({ events: rows });
    }

    if (req.user.role === "manager") {
      const managed = (await all("SELECT id FROM projects WHERE manager_id = ?", [req.user.id])).map((p) => p.id);
      if (managed.length === 0) return res.json({ events: [] });
      if (pid && !managed.includes(pid)) return res.json({ events: [] });
      const scope = pid ? [pid] : managed;
      const ph    = scope.map(() => "?").join(",");
      const rows  = await all(
        `${base} WHERE a.project_id IN (${ph}) ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
        [...scope, limit, offset]
      );
      return res.json({ events: rows });
    }

    const joined = (await all("SELECT project_id FROM project_members WHERE user_id = ?", [req.user.id]))
      .map((r) => r.project_id);
    if (joined.length === 0) return res.json({ events: [] });
    if (pid && !joined.includes(pid)) return res.json({ events: [] });
    const scope = pid ? [pid] : joined;
    const ph    = scope.map(() => "?").join(",");
    const rows  = await all(
      `${base} WHERE a.project_id IN (${ph}) ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
      [...scope, limit, offset]
    );
    res.json({ events: rows });
  } catch (err) { next(err); }
});

export default router;
